import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  claimProductListingSync,
  getProductListingById,
  getProductListingVariants,
  updateProductListingSyncState,
  upsertProductListingVariant,
} from "@/lib/commerce/listings/service";
import { getProductListingMedia, upsertProductListingMedia } from "@/lib/commerce/listings/media";
import { getProductDetails } from "@/lib/commerce/products/service";
import { shopifyGraphQL } from "@/lib/platforms/shopify/client";
import { mapProductToShopifyMedia, mapVariantToShopifyVariant, type ShopifyCatalogProduct } from "@/lib/platforms/shopify/mapper";

interface ShopifyUserError { field?: string[] | null; message: string; }
interface ProductUpdatePayload { productUpdate: { product: { id: string; media: { nodes: ShopifyMediaNode[] } } | null; userErrors: ShopifyUserError[]; }; }
interface VariantUpdatePayload { productVariantsBulkUpdate: { productVariants: Array<{ id: string }>; userErrors: ShopifyUserError[]; }; }
interface VariantCreatePayload { productVariantsBulkCreate: { productVariants: Array<{ id: string }>; userErrors: ShopifyUserError[]; }; }
interface ShopifyVariantNode { id: string; sku: string | null; }
interface ShopifyProductVariantsPayload { product: { variants: { nodes: ShopifyVariantNode[] } } | null; }
interface ShopifyMediaNode { id: string; alt: string | null; mediaContentType: string; }
interface ShopifyProductMediaPayload { product: { media: { nodes: ShopifyMediaNode[] } } | null; }

type CatalogVariant = ShopifyCatalogProduct["variants"][number];
type CatalogMedia = ShopifyCatalogProduct["media"][number];
type ListingVariantMapping = Awaited<ReturnType<typeof getProductListingVariants>>[number];
type ListingMediaMapping = Awaited<ReturnType<typeof getProductListingMedia>>[number];
type ShopifySyncProduct = Omit<ShopifyCatalogProduct, "id">;
type ExistingVariantEntry = { variant: CatalogVariant; mapping: ListingVariantMapping | undefined };

function errorsMessage(errors: ShopifyUserError[]) { return errors.map((error) => `${error.message}${error.field?.length ? ` [${error.field.join(".")}]` : ""}`).join("; "); }
function throwIfErrors(errors: ShopifyUserError[], fallback: string) { if (errors.length) throw new Error(errorsMessage(errors) || fallback); }
function mediaType(media: CatalogMedia) { return media.resource_type === "video" ? "VIDEO" : "IMAGE"; }
function mediaKey(alt: string | null | undefined, type: string) { return `${alt?.trim() || ""}\u0000${type}`; }

async function reconcileVariantMappings(channelId: string, listingId: string, userId: number, productId: string, variants: CatalogVariant[], mappings: ListingVariantMapping[]) {
  const result = await shopifyGraphQL<ShopifyProductVariantsPayload>(channelId, userId, userId, `query GetProductVariants($id: ID!) { product(id: $id) { variants(first: 250) { nodes { id sku } } } }`, { id: productId });
  if (!result.product) throw new Error("Shopify product was not found while reconciling variants");
  const shopifyVariants = result.product.variants.nodes;
  const byId = new Set(shopifyVariants.map((variant) => String(variant.id)));
  const bySku = new Map<string, ShopifyVariantNode[]>();
  for (const variant of shopifyVariants) { const sku = variant.sku?.trim(); if (!sku) continue; const matches = bySku.get(sku) ?? []; matches.push(variant); bySku.set(sku, matches); }
  const mapped = new Map<string, ListingVariantMapping>(mappings.map((row) => [String(row.variant_id), row]));
  const usedExternalIds = new Set<string>();
  for (const mapping of mappings) { if (mapping.external_id && byId.has(String(mapping.external_id))) usedExternalIds.add(String(mapping.external_id)); }
  for (const variant of variants) {
    const current = mapped.get(String(variant.id));
    const currentExternalId = current?.external_id ? String(current.external_id) : null;
    if (currentExternalId && byId.has(currentExternalId)) continue;
    const sku = variant.sku?.trim(); if (!sku) continue;
    const matches = bySku.get(sku) ?? []; if (matches.length !== 1) continue;
    const candidate = matches[0]; if (!candidate || usedExternalIds.has(String(candidate.id))) continue;
    const saved = await upsertProductListingVariant(listingId, userId, { variantId: variant.id, externalId: candidate.id, syncStatus: "synced", providerMetadata: { recoveredBy: "sku", sku } });
    if (saved.error) throw new Error(saved.error);
    if (saved.listingVariant) { mapped.set(String(variant.id), saved.listingVariant); usedExternalIds.add(String(candidate.id)); }
  }
  return mapped;
}

async function reconcileMediaMappings(channelId: string, listingId: string, userId: number, productId: string, media: CatalogMedia[], mappings: ListingMediaMapping[]) {
  const result = await shopifyGraphQL<ShopifyProductMediaPayload>(channelId, userId, userId, `query GetProductMedia($id: ID!) { product(id: $id) { media(first: 250) { nodes { id alt mediaContentType } } } }`, { id: productId });
  if (!result.product) throw new Error("Shopify product was not found while reconciling media");
  const shopifyMedia = result.product.media.nodes;
  const byId = new Set(shopifyMedia.map((item) => String(item.id)));
  const mapped = new Map<string, ListingMediaMapping>(mappings.map((row) => [String(row.product_media_id), row]));
  const usedExternalIds = new Set<string>();
  for (const mapping of mappings) { if (mapping.external_id && byId.has(String(mapping.external_id))) usedExternalIds.add(String(mapping.external_id)); }
  const candidates = new Map<string, ShopifyMediaNode[]>();
  for (const item of shopifyMedia) { const key = mediaKey(item.alt, item.mediaContentType); const matches = candidates.get(key) ?? []; matches.push(item); candidates.set(key, matches); }
  const unmatched: CatalogMedia[] = [];
  for (const canonical of media) {
    const current = mapped.get(String(canonical.product_media_id));
    if (current?.external_id && byId.has(String(current.external_id))) continue;
    const key = mediaKey(canonical.original_name || null, mediaType(canonical));
    const matches = candidates.get(key) ?? [];
    const candidate = matches.find((item) => !usedExternalIds.has(String(item.id)));
    if (candidate) {
      const saved = await upsertProductListingMedia(listingId, userId, { productMediaId: canonical.product_media_id, externalId: candidate.id, syncStatus: "synced", providerMetadata: { provider: "shopify", recoveredBy: "alt_and_type" } });
      if (saved.error) throw new Error(saved.error);
      if (saved.listingMedia) { mapped.set(String(canonical.product_media_id), saved.listingMedia); usedExternalIds.add(String(candidate.id)); }
    } else unmatched.push(canonical);
  }
  if (unmatched.length === 0) return mapped;
  const created = await shopifyGraphQL<ProductUpdatePayload>(channelId, userId, userId, `mutation AddProductMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) { productUpdate(product: $product, media: $media) { product { id media(first: 250) { nodes { id alt mediaContentType } } } userErrors { field message } } }`, {
    product: { id: productId },
    media: mapProductToShopifyMedia({ id: productId, name: "", description: null, brand: null, category: null, status: "draft", variants: [], media: unmatched }),
  });
  throwIfErrors(created.productUpdate.userErrors, "Shopify product media creation failed");
  if (!created.productUpdate.product) throw new Error("Shopify did not return the product after media creation");
  const refreshed = created.productUpdate.product.media.nodes;
  const refreshedCandidates = new Map<string, ShopifyMediaNode[]>();
  for (const item of refreshed) { const key = mediaKey(item.alt, item.mediaContentType); const matches = refreshedCandidates.get(key) ?? []; matches.push(item); refreshedCandidates.set(key, matches); }
  for (const canonical of unmatched) {
    const key = mediaKey(canonical.original_name || null, mediaType(canonical));
    const matches = refreshedCandidates.get(key) ?? [];
    const candidate = matches.find((item) => !usedExternalIds.has(String(item.id)));
    if (!candidate) throw new Error("Shopify media mapping response was incomplete");
    const saved = await upsertProductListingMedia(listingId, userId, { productMediaId: canonical.product_media_id, externalId: candidate.id, syncStatus: "synced", providerMetadata: { provider: "shopify", source: "sync" } });
    if (saved.error) throw new Error(saved.error);
    usedExternalIds.add(String(candidate.id));
  }
  return mapped;
}

export async function syncShopifyProduct(userId: number, channelId: string, listingId: string, shopifyProductId: string) {
  const listing = await getProductListingById(listingId, userId);
  if (!listing) throw new Error("Product listing not found");
  if (String(listing.channel_id) !== String(channelId)) throw new Error("Product listing does not belong to the selected Shopify channel");
  if (!listing.external_id || String(listing.external_id) !== String(shopifyProductId)) throw new Error("Shopify product does not match the listing");
  if (!["draft", "active"].includes(String(listing.status).toLowerCase())) throw new Error("Product listing is not syncable in its current lifecycle state");
  const channel = await getCommerceChannelById(channelId, userId);
  if (!channel) throw new Error("Commerce channel not found");
  if (String(channel.provider).toLowerCase() !== "shopify") throw new Error("Selected commerce channel is not Shopify");
  if (String(channel.status).toLowerCase() !== "active") throw new Error("Selected Shopify channel is not active");
  const claim = await claimProductListingSync(listingId, userId);
  if (claim.error) { if (claim.error === "LISTING_NOT_FOUND") throw new Error("Product listing not found"); throw new Error("Product listing sync is already in progress"); }
  try {
    const product = await getProductDetailsForSync(userId, listingId);
    if (!product) throw new Error("Product not found");
    if (product.variants.length === 0) throw new Error("Shopify sync requires at least one product variant");
    const updated = await shopifyGraphQL<ProductUpdatePayload>(channelId, userId, userId, `mutation UpdateProduct($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id media(first: 250) { nodes { id alt mediaContentType } } } userErrors { field message } } }`, { product: { id: shopifyProductId, title: product.name, descriptionHtml: product.description, vendor: product.brand, productType: product.category, status: product.status === "active" ? "ACTIVE" : product.status === "archived" ? "ARCHIVED" : "DRAFT" } });
    throwIfErrors(updated.productUpdate.userErrors, "Shopify product update failed");
    if (!updated.productUpdate.product) throw new Error("Shopify did not return the updated product");
    const mediaMappings = await getProductListingMedia(listingId, userId);
    await reconcileMediaMappings(channelId, listingId, userId, shopifyProductId, product.media, mediaMappings);
    const mappings = await getProductListingVariants(listingId, userId);
    const mapped = await reconcileVariantMappings(channelId, listingId, userId, shopifyProductId, product.variants, mappings);
    const existing: Array<{ variant: CatalogVariant; mapping: ListingVariantMapping }> = product.variants.map((variant: CatalogVariant): ExistingVariantEntry => ({ variant, mapping: mapped.get(String(variant.id)) })).filter((entry: ExistingVariantEntry): entry is { variant: CatalogVariant; mapping: ListingVariantMapping } => Boolean(entry.mapping?.external_id));
    if (existing.length) {
      const result = await shopifyGraphQL<VariantUpdatePayload>(channelId, userId, userId, `mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, { productId: shopifyProductId, variants: existing.map(({ variant, mapping }) => ({ id: String(mapping.external_id), ...mapVariantToShopifyVariant(variant) })) });
      throwIfErrors(result.productVariantsBulkUpdate.userErrors, "Shopify variant update failed");
      if (result.productVariantsBulkUpdate.productVariants.length !== existing.length) throw new Error("Shopify returned an unexpected number of updated variants");
      for (let i = 0; i < existing.length; i += 1) { const returned = result.productVariantsBulkUpdate.productVariants[i]; if (!returned) throw new Error("Shopify variant update response was incomplete"); const saved = await upsertProductListingVariant(listingId, userId, { variantId: existing[i].variant.id, externalId: returned.id, syncStatus: "synced" }); if (saved.error) throw new Error(saved.error); }
    }
    const newVariants = product.variants.filter((variant: CatalogVariant) => !mapped.get(String(variant.id))?.external_id);
    if (newVariants.length) {
      const result = await shopifyGraphQL<VariantCreatePayload>(channelId, userId, userId, `mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $productId, variants: $variants) { productVariants { id } userErrors { field message } } }`, { productId: shopifyProductId, variants: newVariants.map(mapVariantToShopifyVariant) });
      throwIfErrors(result.productVariantsBulkCreate.userErrors, "Shopify new variant creation failed");
      if (result.productVariantsBulkCreate.productVariants.length !== newVariants.length) throw new Error("Shopify returned an unexpected number of created variants");
      for (let i = 0; i < newVariants.length; i += 1) { const returned = result.productVariantsBulkCreate.productVariants[i]; if (!returned) throw new Error("Shopify new variant response was incomplete"); const saved = await upsertProductListingVariant(listingId, userId, { variantId: newVariants[i].id, externalId: returned.id, syncStatus: "synced" }); if (saved.error) throw new Error(saved.error); }
    }
    const completed = await updateProductListingSyncState(listingId, userId, { syncStatus: "synced", externalId: shopifyProductId, lastError: null, providerMetadata: { provider: "shopify", syncMode: "update", updatedVariantCount: existing.length, createdVariantCount: newVariants.length, canonicalVariantCount: product.variants.length, canonicalMediaCount: product.media.length } });
    if (completed.error) throw new Error(completed.error);
    return completed.listing;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify sync failed";
    await updateProductListingSyncState(listingId, userId, { syncStatus: "error", lastError: message });
    throw error;
  }
}

async function getProductDetailsForSync(userId: number, listingId: string): Promise<ShopifySyncProduct | null> {
  const listing = await getProductListingById(listingId, userId);
  if (!listing) return null;
  const product = await getProductDetails(String(listing.product_id), userId);
  if (!product) return null;
  return {
    name: String(product.name),
    description: product.description ? String(product.description) : null,
    brand: product.brand ? String(product.brand) : null,
    category: product.category ? String(product.category) : null,
    status: String(product.status),
    variants: product.variants.map((variant: CatalogVariant) => ({ id: String(variant.id), name: variant.name ? String(variant.name) : null, sku: variant.sku ? String(variant.sku) : null, barcode: variant.barcode ? String(variant.barcode) : null, price: variant.price === null ? null : Number(variant.price), mrp: variant.mrp === null ? null : Number(variant.mrp), cost_price: variant.cost_price === null ? null : Number(variant.cost_price) })),
    media: product.media.map((media: CatalogMedia) => ({ product_media_id: String(media.product_media_id), original_name: media.original_name ? String(media.original_name) : null, secure_url: String(media.secure_url), resource_type: media.resource_type ? String(media.resource_type) : null })),
  };
}
