import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  createProductListing,
  getProductListings,
  updateProductListingSyncState,
  upsertProductListingVariant,
} from "@/lib/commerce/listings/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { shopifyGraphQL } from "@/lib/platforms/shopify/client";
import {
  mapProductToShopifyMedia,
  mapProductToShopifyProduct,
  mapVariantToShopifyVariant,
  type ShopifyCatalogProduct,
} from "@/lib/platforms/shopify/mapper";

interface ShopifyUserError {
  field?: string[] | null;
  message: string;
}

interface ProductCreatePayload {
  productCreate: {
    product: {
      id: string;
      variants: { nodes: Array<{ id: string }> };
    } | null;
    userErrors: ShopifyUserError[];
  };
}

interface ProductVariantsBulkUpdatePayload {
  productVariantsBulkUpdate: {
    productVariants: Array<{ id: string }>;
    userErrors: ShopifyUserError[];
  };
}

interface ProductVariantsBulkCreatePayload {
  productVariantsBulkCreate: {
    productVariants: Array<{ id: string }>;
    userErrors: ShopifyUserError[];
  };
}

type CatalogVariant = ShopifyCatalogProduct["variants"][number];
type CatalogMedia = ShopifyCatalogProduct["media"][number];

function formatUserErrors(errors: ShopifyUserError[]) {
  return errors
    .map((error) => {
      const field = error.field?.length ? ` [${error.field.join(".")}]` : "";
      return `${error.message}${field}`;
    })
    .join("; ");
}

function throwIfUserErrors(errors: ShopifyUserError[], fallback: string) {
  if (errors.length > 0) {
    throw new Error(formatUserErrors(errors) || fallback);
  }
}

async function ensureListing(userId: number, channelId: string, productId: string) {
  const listings = await getProductListings(userId);
  const existing = listings.find(
    (listing) =>
      String(listing.channel_id) === channelId && String(listing.product_id) === productId,
  );

  if (existing) return existing;

  const created = await createProductListing(userId, {
    channelId,
    productId,
    status: "draft",
  });

  if (created.listing) return created.listing;

  if (created.error === "LISTING_ALREADY_EXISTS") {
    const retryListings = await getProductListings(userId);
    const retry = retryListings.find(
      (listing) =>
        String(listing.channel_id) === channelId && String(listing.product_id) === productId,
    );
    if (retry) return retry;
  }

  throw new Error(created.error || "Unable to create product listing");
}

function asShopifyCatalogProduct(product: Awaited<ReturnType<typeof getProductDetails>>) {
  if (!product) return null;

  return {
    id: String(product.id),
    name: String(product.name),
    description: product.description ? String(product.description) : null,
    brand: product.brand ? String(product.brand) : null,
    category: product.category ? String(product.category) : null,
    status: String(product.status),
    variants: product.variants.map((variant: CatalogVariant) => ({
      id: String(variant.id),
      name: variant.name ? String(variant.name) : null,
      sku: variant.sku ? String(variant.sku) : null,
      barcode: variant.barcode ? String(variant.barcode) : null,
      price: variant.price === null ? null : Number(variant.price),
      mrp: variant.mrp === null ? null : Number(variant.mrp),
      cost_price: variant.cost_price === null ? null : Number(variant.cost_price),
    })),
    media: product.media.map((media: CatalogMedia) => ({
      original_name: media.original_name ? String(media.original_name) : null,
      secure_url: String(media.secure_url),
      resource_type: media.resource_type ? String(media.resource_type) : null,
    })),
  } satisfies ShopifyCatalogProduct;
}

export async function publishShopifyProduct(
  userId: number,
  channelId: string,
  productId: string,
) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel) throw new Error("Commerce channel not found");
  if (channel.provider !== "shopify") throw new Error("Commerce channel is not Shopify");
  if (channel.status !== "active") throw new Error("Shopify channel is not active");

  const product = asShopifyCatalogProduct(await getProductDetails(productId, userId));
  if (!product) throw new Error("Product not found");
  if (product.variants.length === 0) {
    throw new Error("Shopify publishing requires at least one product variant");
  }

  const listing = await ensureListing(userId, channelId, productId);

  if (listing.external_id) {
    throw new Error(
      "Shopify product already exists for this listing; use the Shopify sync/update flow instead of publishing again",
    );
  }

  await updateProductListingSyncState(listing.id, userId, {
    syncStatus: "syncing",
    lastError: null,
  });

  try {
    const productInput = mapProductToShopifyProduct(product);
    const media = mapProductToShopifyMedia(product);

    const created = await shopifyGraphQL<ProductCreatePayload>(
      channelId,
      `
        mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
          productCreate(product: $product, media: $media) {
            product {
              id
              variants(first: 1) { nodes { id } }
            }
            userErrors { field message }
          }
        }
      `,
      { product: productInput, media },
    );

    throwIfUserErrors(created.productCreate.userErrors, "Shopify product creation failed");

    const shopifyProduct = created.productCreate.product;
    if (!shopifyProduct) throw new Error("Shopify did not return the created product");

    await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "syncing",
      externalId: shopifyProduct.id,
      lastError: null,
    });

    const initialShopifyVariant = shopifyProduct.variants.nodes[0];
    const firstVariant = product.variants[0];
    if (!initialShopifyVariant || !firstVariant) {
      throw new Error("Shopify did not return the initial product variant");
    }

    const updatedInitial = await shopifyGraphQL<ProductVariantsBulkUpdatePayload>(
      channelId,
      `
        mutation UpdateInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id }
            userErrors { field message }
          }
        }
      `,
      {
        productId: shopifyProduct.id,
        variants: [{ id: initialShopifyVariant.id, ...mapVariantToShopifyVariant(firstVariant) }],
      },
    );

    throwIfUserErrors(
      updatedInitial.productVariantsBulkUpdate.userErrors,
      "Shopify initial variant update failed",
    );

    const updatedInitialVariant = updatedInitial.productVariantsBulkUpdate.productVariants[0];
    if (!updatedInitialVariant) throw new Error("Shopify did not return the updated initial variant");

    await upsertProductListingVariant(listing.id, userId, {
      variantId: firstVariant.id,
      externalId: updatedInitialVariant.id,
      syncStatus: "synced",
    });

    const remainingVariants = product.variants.slice(1);
    if (remainingVariants.length > 0) {
      const createdVariants = await shopifyGraphQL<ProductVariantsBulkCreatePayload>(
        channelId,
        `
          mutation CreateRemainingVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkCreate(productId: $productId, variants: $variants) {
              productVariants { id }
              userErrors { field message }
            }
          }
        `,
        {
          productId: shopifyProduct.id,
          variants: remainingVariants.map(mapVariantToShopifyVariant),
        },
      );

      throwIfUserErrors(
        createdVariants.productVariantsBulkCreate.userErrors,
        "Shopify variant creation failed",
      );

      const returnedVariants = createdVariants.productVariantsBulkCreate.productVariants;
      if (returnedVariants.length !== remainingVariants.length) {
        throw new Error("Shopify returned an unexpected number of created variants");
      }

      for (let index = 0; index < remainingVariants.length; index += 1) {
        const variant = remainingVariants[index];
        const createdVariant = returnedVariants[index];
        if (!createdVariant) throw new Error("Shopify variant mapping response was incomplete");

        await upsertProductListingVariant(listing.id, userId, {
          variantId: variant.id,
          externalId: createdVariant.id,
          syncStatus: "synced",
        });
      }
    }

    const completed = await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "synced",
      externalId: shopifyProduct.id,
      lastError: null,
      providerMetadata: {
        provider: "shopify",
        publishedVariantCount: product.variants.length,
      },
    });

    if (completed.error) throw new Error(completed.error);
    return completed.listing;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify publishing failed";
    await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "error",
      lastError: message,
    });
    throw error;
  }
}
