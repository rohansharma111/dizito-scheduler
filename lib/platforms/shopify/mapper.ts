export interface ShopifyProductMediaInput {
  originalSource: string;
  alt: string;
  mediaContentType: "IMAGE" | "VIDEO";
}

export interface ShopifyProductVariantInput {
  optionValues: Array<{
    name: string;
    optionName: "Title";
  }>;
  price?: string;
  compareAtPrice?: string | null;
  barcode?: string | null;
  inventoryItem?: {
    sku?: string | null;
    cost?: string | null;
  };
}

export interface ShopifyProductCreateInput {
  title: string;
  descriptionHtml?: string | null;
  vendor?: string | null;
  productType?: string | null;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  metafields?: Array<{ namespace: string; key: string; type: string; value: string }>;
}

export interface ShopifyCatalogProduct {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  status: string;
  variants: Array<{
    id: string;
    name: string | null;
    sku: string | null;
    barcode: string | null;
    price: number | null;
    mrp: number | null;
    cost_price: number | null;
  }>;
  media: Array<{
    product_media_id: string;
    original_name: string | null;
    secure_url: string;
    resource_type: string | null;
  }>;
}

function toMoney(value: number | null | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function mapStatus(status: string): ShopifyProductCreateInput["status"] {
  if (status === "active") return "ACTIVE";
  if (status === "archived") return "ARCHIVED";
  return "DRAFT";
}

export function mapProductToShopifyProduct(
  product: ShopifyCatalogProduct,
  options?: { listingId?: string },
): ShopifyProductCreateInput {
  return {
    title: product.name,
    descriptionHtml: product.description || null,
    vendor: product.brand || null,
    productType: product.category || null,
    status: mapStatus(product.status),
    metafields: options?.listingId
      ? [{ namespace: "dizito", key: "listing_id", type: "single_line_text_field", value: options.listingId }]
      : undefined,
  };
}

export function mapProductToShopifyMedia(product: ShopifyCatalogProduct): ShopifyProductMediaInput[] {
  return product.media
    .filter((media) => Boolean(media.secure_url))
    .map((media) => ({
      originalSource: media.secure_url,
      alt: media.original_name || product.name,
      mediaContentType: media.resource_type === "video" ? "VIDEO" : "IMAGE",
    }));
}

export function mapVariantToShopifyVariant(
  variant: ShopifyCatalogProduct["variants"][number],
): ShopifyProductVariantInput {
  return {
    optionValues: [
      {
        name: variant.name?.trim() || "Default",
        optionName: "Title",
      },
    ],
    price: toMoney(variant.price),
    compareAtPrice: toMoney(variant.mrp) ?? null,
    barcode: variant.barcode || null,
    inventoryItem: {
      sku: variant.sku || null,
      cost: toMoney(variant.cost_price) ?? null,
    },
  };
}
