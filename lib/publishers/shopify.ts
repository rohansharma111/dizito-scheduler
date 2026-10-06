import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { pool } from "@/lib/db";
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
import { syncShopifyProduct } from "@/lib/publishers/shopify-sync";

interface ShopifyUserError {
  field?: string[] | null;
  message: string;
}

interface ShopifyCreatedMediaNode {
  id: string;
  alt: string | null;
  mediaContentType: string;
}

interface ProductCreatePayload {
  productCreate: {
    product: {
      id: string;
      variants: { nodes: Array<{ id: string }> };
      media: { nodes: ShopifyCreatedMediaNode[] };
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

function mediaType(media: CatalogMedia) {
  return media.resource_type === "video" ? "VIDEO" : "IMAGE";
}

function mediaKey(alt: string | null | undefined, type: string) {
  return `${alt?.trim() || ""}\u0000${type}`;
}

async function withShopifyPublishLock<T>(
  userId: number,
  channelId: string,
  productId: string,
  operation: () => Promise<T>,
) {
  const client = await pool.connect();
  const lockKey = `shopify:publish:${userId}:${channelId}:${productId}`;
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtextextended($1, 0))",
      [lockKey],
    );
    return await operation();
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [lockKey])
      .catch((error) => console.error("Unable to release Shopify publish lock:", error));
    client.release();
  }
}

async function findShopifyProductByListingMarker(
  channelId: string,
  userId: number,
  listingId: string,
) {
  const result = await shopifyGraphQL<{
    products: { nodes: Array<{ id: string }> };
  }>(
    channelId,
    userId,
    `query FindDizitoProductByListingMarker($query: String!) {
      products(first: 2, query: $query) {
        nodes { id }
      }
    }`,
    { query: `metafields.dizito.listing_id:"${listingId}"` },
  );

  const matches = result.products.nodes;
  if (matches.length > 1) {
    throw new Error("Multiple Shopify products match the Dizito listing marker");
  }
  return matches[0]?.id ?? null;
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

async function persistInitialMediaMappings(
  listingId: string,
  userId: number,
  canonicalMedia: CatalogMedia[],
  returnedMedia: ShopifyCreatedMediaNode[],
) {
  const candidates = new Map<string, ShopifyCreatedMediaNode[]>();
  for (const item of returnedMedia) {
    const key = mediaKey(item.alt, item.mediaContentType);
    const matches = candidates.get(key) ?? [];
    matches.push(item);
    candidates.set(key, matches);
  }

  const usedExternalIds = new Set<string>();
  for (const canonical of canonicalMedia) {
    const key = mediaKey(canonical.original_name || null, mediaType(canonical));
    const matches = candidates.get(key) ?? [];
    const available = matches.filter((item) => !usedExternalIds.has(String(item.id)));
    if (available.length !== 1) {
      throw new Error("Shopify media response could not be deterministically mapped to canonical media");
    }
    const matched = available[0];
    if (!matched) throw new Error("Shopify media response was incomplete");
    const savedMedia = await upsertProductListingMedia(listingId, userId, {
      productMediaId: canonical.product_media_id,
      externalId: matched.id,
      syncStatus: "synced",
      providerMetadata: { provider: "shopify", source: "initial_publish" },
    });
    if (savedMedia.error) throw new Error(savedMedia.error);
    usedExternalIds.add(String(matched.id));
  }
}

export async function publishShopifyProduct(
  userId: number,
  channelId: string,
  productId: string,
  confirmLivePublish: boolean,
) {
  if (confirmLivePublish !== true) {
    throw new Error("LIVE_PUBLISH_CONFIRMATION_REQUIRED");
  }

  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel) throw new Error("Commerce channel not found");
  if (channel.provider !== "shopify") throw new Error("Commerce channel is not Shopify");
  if (channel.status !== "active") throw new Error("Shopify channel is not active");

  return withShopifyPublishLock(userId, channelId, productId, async () => {
    const product = asShopifyCatalogProduct(await getProductDetails(productId, userId));
  if (!product) throw new Error("Product not found");
  if (product.variants.length === 0) throw new Error("Shopify publishing requires at least one product variant");

  const listing = await ensureListing(userId, channelId, productId);
  if (listing.external_id) {
    throw new Error("Shopify product already exists for this listing; use the Shopify sync/update flow instead of publishing again");
  }

  const recoveredExternalId = await findShopifyProductByListingMarker(
    channelId,
    userId,
    String(listing.id),
  );
  if (recoveredExternalId) {
    const recovered = await updateProductListingSyncState(listing.id, userId, {
      syncStatus: "syncing",
      externalId: recoveredExternalId,
      lastError: null,
      providerMetadata: {
        provider: "shopify",
        publishMode: "recovered_create",
        recoveryMarker: "dizito.listing_id",
      },
    });
    if (recovered.error) throw new Error(recovered.error);
    return syncShopifyProduct(userId, channelId, String(listing.id), recoveredExternalId);
  }

  try {
    const createResult = await shopifyGraphQL<ProductCreatePayload>(channelId, userId, `mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) { productCreate(product: $product, media: $media) { product { id variants(first: 1) { nodes { id } } media(first: 250) { nodes { id alt mediaContentType } } } userErrors { field message } } }`, {
      product: mapProductToShopifyProduct(product, { listingId: String(listing.id) }),
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
    const updatedFirstVariant = await shopifyGraphQL<ProductVariantsBulkUpdatePayload>(channelId, userId, `mutation UpdateInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, {
      productId: shopifyProduct.id,
      variants: [{ id: initialVariant.id, ...mapVariantToShopifyVariant(firstVariant) }],
    });
    throwIfUserErrors(updatedFirstVariant.productVariantsBulkUpdate.userErrors, "Shopify initial variant update failed");
    if (updatedFirstVariant.productVariantsBulkUpdate.productVariants.length !== 1) throw new Error("Shopify returned an unexpected initial variant response");
    const savedFirstVariant = await upsertProductListingVariant(listing.id, userId, { variantId: firstVariant.id, externalId: updatedFirstVariant.productVariantsBulkUpdate.productVariants[0]?.id, syncStatus: "synced" });
    if (savedFirstVariant.error) throw new Error(savedFirstVariant.error);

    const remainingVariants = product.variants.slice(1);
    if (remainingVariants.length) {
      const createdVariants = await shopifyGraphQL<ProductVariantsBulkCreatePayload>(channelId, userId, `mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, {
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

    await persistInitialMediaMappings(listing.id, userId, product.media, shopifyProduct.media.nodes);

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
  });
}
