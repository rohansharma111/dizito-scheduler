import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  createProductListing,
  getProductListings,
  updateProductListingSyncState,
  upsertProductListingVariant,
} from "@/lib/commerce/listings/service";
import { upsertProductListingMedia } from "@/lib/commerce/listings/media";
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
      media: { nodes: Array<{ id: string }> };
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
  if (errors.length > 0) throw new Error(formatUserErrors(errors) || fallback);
}

async function ensureListing(userId: number, channelId: string, productId: string) {
  const listings = await getProductListings(userId);
  const existing = listings.find(
    (listing) => String(listing.channel_id) === channelId && String(listing.product_id) === productId,
  );
  if (existing) return existing;

  const created = await createProductListing(userId, { channelId, productId, status: "draft" });
  if (created.listing) return created.listing;

  if (created.error === "LISTING_ALREADY_EXISTS") {
    const retryListings = await getProductListings(userId);
    const retry = retryListings.find(
      (listing) => String(listing.channel_id) === channelId && String(listing.product_id) === productId,
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
      product_media_id: String(media.product_media_id),
      original_name: media.original_name ? String(media.original_name) : null,
      secure_url: String(media.secure_url),
      resource_type: media.resource_type ? String(media.resource_type) : null,
    })),
  } satisfies ShopifyCatalogProduct;
}

export async function publishShopifyProduct(userId: number, channelId: string, productId: string) {
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel) throw new Error("Commerce channel not found");
  if (channel.provider !== "shopify") throw new Error("Commerce channel is not Shopify");
  if (channel.status !== "active") throw new Error("Shopify channel is not active");

  const product = asShopifyCatalogProduct(await getProductDetails(productId, userId));
  if (!product) throw new Error("Product not found");
  if (product.variants.length === 0) throw new Error("Shopify publishing requires at least one product variant");

  const listing = await ensureListing(userId, channelId, productId);
  if (listing.external_id) {
    throw new Error("Shopify product already exists for this listing; use the Shopify sync/update flow instead of publishing again");
  }

  try {
    const createResult = await shopifyGraphQL<ProductCreatePayload>(channelId, `mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) { productCreate(product: $product, media: $media) { product { id variants(first: 1) { nodes { id } } media(first: 250) { nodes { id } } } userErrors { field message } } }`, {
      product: mapProductToShopifyProduct(product),
      media: mapProductToShopifyMedia(product),
    });

    throwIfUserErrors(createResult.productCreate.userErrors, "Shopify product creation failed");
    if (!createResult.productCreate.product) throw new Error("Shopify did not return the created product");

    const shopifyProduct = createResult.productCreate.product;
    const updatedListing = await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "syncing",
      externalId: shopifyProduct.id,
      lastError: null,
    });
    if (updatedListing.error) throw new Error(updatedListing.error);

    const initialVariant = shopifyProduct.variants.nodes[0];
    if (!initialVariant) throw new Error("Shopify did not return the initial product variant");
    const firstVariant = product.variants[0];
    if (!firstVariant) throw new Error("Product variant was unexpectedly missing");
    const updatedFirstVariant = await shopifyGraphQL<ProductVariantsBulkUpdatePayload>(channelId, `mutation UpdateInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, {
      productId: shopifyProduct.id,
      variants: [{ id: initialVariant.id, ...mapVariantToShopifyVariant(firstVariant) }],
    });
    throwIfUserErrors(updatedFirstVariant.productVariantsBulkUpdate.userErrors, "Shopify initial variant update failed");
    if (updatedFirstVariant.productVariantsBulkUpdate.productVariants.length !== 1) throw new Error("Shopify returned an unexpected initial variant response");
    const savedFirstVariant = await upsertProductListingVariant(listing.id, userId, { variantId: firstVariant.id, externalId: updatedFirstVariant.productVariantsBulkUpdate.productVariants[0]?.id, syncStatus: "synced" });
    if (savedFirstVariant.error) throw new Error(savedFirstVariant.error);

    const remainingVariants = product.variants.slice(1);
    if (remainingVariants.length) {
      const createdVariants = await shopifyGraphQL<ProductVariantsBulkCreatePayload>(channelId, `mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, {
        productId: shopifyProduct.id,
        variants: remainingVariants.map(mapVariantToShopifyVariant),
      });
      throwIfUserErrors(createdVariants.productVariantsBulkCreate.userErrors, "Shopify variant creation failed");
      if (createdVariants.productVariantsBulkCreate.productVariants.length !== remainingVariants.length) throw new Error("Shopify returned an unexpected number of created variants");
      for (let i = 0; i < remainingVariants.length; i += 1) {
        const variant = remainingVariants[i];
        const createdVariant = createdVariants.productVariantsBulkCreate.productVariants[i];
        if (!variant || !createdVariant) throw new Error("Shopify variant creation response was incomplete");
        const saved = await upsertProductListingVariant(listing.id, userId, { variantId: variant.id, externalId: createdVariant.id, syncStatus: "synced" });
        if (saved.error) throw new Error(saved.error);
      }
    }

    for (let index = 0; index < product.media.length; index += 1) {
      const canonicalMedia = product.media[index];
      const shopifyMedia = shopifyProduct.media.nodes[index];
      if (!canonicalMedia || !shopifyMedia) throw new Error("Shopify returned an unexpected number of created media items");
      const savedMedia = await upsertProductListingMedia(listing.id, userId, {
        productMediaId: canonicalMedia.product_media_id,
        externalId: shopifyMedia.id,
        syncStatus: "synced",
        providerMetadata: { provider: "shopify", source: "initial_publish" },
      });
      if (savedMedia.error) throw new Error(savedMedia.error);
    }

    const completed = await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "synced",
      externalId: shopifyProduct.id,
      lastError: null,
      providerMetadata: {
        provider: "shopify",
        publishMode: "create",
        publishedVariantCount: product.variants.length,
        publishedMediaCount: product.media.length,
      },
    });
    if (completed.error) throw new Error(completed.error);
    return completed.listing;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify publishing failed";
    await updateProductListingSyncState(listing.id, userId, { syncStatus: "error", lastError: message });
    throw error;
  }
}
