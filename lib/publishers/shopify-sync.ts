import { getProductListingById, getProductListingVariants, updateProductListingSyncState, upsertProductListingVariant } from "@/lib/commerce/listings/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { shopifyGraphQL } from "@/lib/platforms/shopify/client";
import { mapVariantToShopifyVariant, type ShopifyCatalogProduct } from "@/lib/platforms/shopify/mapper";

interface ShopifyUserError { field?: string[] | null; message: string; }
interface ProductUpdatePayload { productUpdate: { product: { id: string } | null; userErrors: ShopifyUserError[]; }; }
interface VariantUpdatePayload { productVariantsBulkUpdate: { productVariants: Array<{ id: string }>; userErrors: ShopifyUserError[]; }; }
interface VariantCreatePayload { productVariantsBulkCreate: { productVariants: Array<{ id: string }>; userErrors: ShopifyUserError[]; }; }

type CatalogVariant = ShopifyCatalogProduct["variants"][number];
type ListingVariantMapping = Awaited<ReturnType<typeof getProductListingVariants>>[number];
type ShopifySyncProduct = Omit<ShopifyCatalogProduct, "id" | "media">;

type ExistingVariantEntry = {
  variant: CatalogVariant;
  mapping: ListingVariantMapping | undefined;
};

function errorsMessage(errors: ShopifyUserError[]) {
  return errors.map((error) => `${error.message}${error.field?.length ? ` [${error.field.join(".")}]` : ""}`).join("; ");
}

function throwIfErrors(errors: ShopifyUserError[], fallback: string) {
  if (errors.length) throw new Error(errorsMessage(errors) || fallback);
}

export async function syncShopifyProduct(userId: number, channelId: string, listingId: string, shopifyProductId: string) {
  const product = await getProductDetailsForSync(userId, listingId);
  if (!product) throw new Error("Product not found");
  if (product.variants.length === 0) throw new Error("Shopify sync requires at least one product variant");

  await updateProductListingSyncState(listingId, userId, { syncStatus: "syncing", lastError: null });

  try {
    const updated = await shopifyGraphQL<ProductUpdatePayload>(channelId, `
      mutation UpdateProduct($product: ProductUpdateInput!) {
        productUpdate(product: $product) { product { id } userErrors { field message } }
      }
    `, { product: {
      id: shopifyProductId,
      title: product.name,
      descriptionHtml: product.description,
      vendor: product.brand,
      productType: product.category,
      status: product.status === "active" ? "ACTIVE" : product.status === "archived" ? "ARCHIVED" : "DRAFT",
    } });
    throwIfErrors(updated.productUpdate.userErrors, "Shopify product update failed");
    if (!updated.productUpdate.product) throw new Error("Shopify did not return the updated product");

    const mappings = await getProductListingVariants(listingId, userId);
    const mapped = new Map<string, ListingVariantMapping>(
      mappings.map((row: ListingVariantMapping) => [String(row.variant_id), row]),
    );
    const existing: Array<{
      variant: CatalogVariant;
      mapping: ListingVariantMapping;
    }> = product.variants
      .map(
        (variant: CatalogVariant): ExistingVariantEntry => ({
          variant,
          mapping: mapped.get(String(variant.id)),
        }),
      )
      .filter(
        (
          entry: ExistingVariantEntry,
        ): entry is {
          variant: CatalogVariant;
          mapping: ListingVariantMapping;
        } => Boolean(entry.mapping?.external_id),
      );

    if (existing.length) {
      const result = await shopifyGraphQL<VariantUpdatePayload>(channelId, `
        mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id } userErrors { field message }
          }
        }
      `, { productId: shopifyProductId, variants: existing.map(({ variant, mapping }) => ({ id: String(mapping.external_id), ...mapVariantToShopifyVariant(variant) })) });
      throwIfErrors(result.productVariantsBulkUpdate.userErrors, "Shopify variant update failed");
      if (result.productVariantsBulkUpdate.productVariants.length !== existing.length) throw new Error("Shopify returned an unexpected number of updated variants");
      for (let i = 0; i < existing.length; i += 1) {
        const returned = result.productVariantsBulkUpdate.productVariants[i];
        if (!returned) throw new Error("Shopify variant update response was incomplete");
        await upsertProductListingVariant(listingId, userId, { variantId: existing[i].variant.id, externalId: returned.id, syncStatus: "synced" });
      }
    }

    const newVariants = product.variants.filter((variant: CatalogVariant) => !mapped.get(String(variant.id))?.external_id);
    if (newVariants.length) {
      const result = await shopifyGraphQL<VariantCreatePayload>(channelId, `
        mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants { id } userErrors { field message }
          }
        }
      `, { productId: shopifyProductId, variants: newVariants.map(mapVariantToShopifyVariant) });
      throwIfErrors(result.productVariantsBulkCreate.userErrors, "Shopify new variant creation failed");
      if (result.productVariantsBulkCreate.productVariants.length !== newVariants.length) throw new Error("Shopify returned an unexpected number of created variants");
      for (let i = 0; i < newVariants.length; i += 1) {
        const returned = result.productVariantsBulkCreate.productVariants[i];
        if (!returned) throw new Error("Shopify new variant response was incomplete");
        await upsertProductListingVariant(listingId, userId, { variantId: newVariants[i].id, externalId: returned.id, syncStatus: "synced" });
      }
    }

    const completed = await updateProductListingSyncState(listingId, userId, {
      syncStatus: "synced", externalId: shopifyProductId, lastError: null,
      providerMetadata: { provider: "shopify", syncMode: "update", updatedVariantCount: existing.length, createdVariantCount: newVariants.length, canonicalVariantCount: product.variants.length },
    });
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
    variants: product.variants.map((variant: CatalogVariant) => ({
      id: String(variant.id), name: variant.name ? String(variant.name) : null,
      sku: variant.sku ? String(variant.sku) : null, barcode: variant.barcode ? String(variant.barcode) : null,
      price: variant.price === null ? null : Number(variant.price), mrp: variant.mrp === null ? null : Number(variant.mrp),
      cost_price: variant.cost_price === null ? null : Number(variant.cost_price),
    })),
  };
}
