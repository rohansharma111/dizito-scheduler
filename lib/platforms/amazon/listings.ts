import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { amazonSpApiRequest } from "@/lib/platforms/amazon/client";

export interface AmazonListingProductInput {
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
}

export interface AmazonListingVariantInput {
  sku: string;
  barcode?: string | null;
  price?: number | null;
}

export type AmazonListingFieldSource =
  | "product.name"
  | "product.description"
  | "product.brand"
  | "product.category"
  | "variant.sku"
  | "variant.barcode"
  | "variant.price"
  | "manual";

export interface AmazonListingFieldMapping {
  source: AmazonListingFieldSource;
  value?: string | null;
}

export interface AmazonListingDraft {
  sku: string;
  productType: string;
  requirements: "LISTING";
  attributes: Record<string, unknown>;
}

function localizedValue(value: string, marketplaceId: string) {
  return [{ value, marketplace_id: marketplaceId, language_tag: "en_IN" }];
}

function marketplaceValue(value: string, marketplaceId: string) {
  return [{ value, marketplace_id: marketplaceId }];
}

function parseManualValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function getSourceValue(
  source: AmazonListingFieldSource,
  product: AmazonListingProductInput,
  variant: AmazonListingVariantInput,
) {
  switch (source) {
    case "product.name": return product.name;
    case "product.description": return product.description ?? null;
    case "product.brand": return product.brand ?? null;
    case "product.category": return product.category ?? null;
    case "variant.sku": return variant.sku;
    case "variant.barcode": return variant.barcode ?? null;
    case "variant.price": return variant.price ?? null;
    default: return null;
  }
}

function normalizeAmazonMetadata(value: unknown, marketplaceId: string): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeAmazonMetadata(item, marketplaceId));
  if (!value || typeof value !== "object") return value;

  const object = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(object)) {
    if (key === "marketplace_id") {
      normalized[key] = marketplaceId;
    } else if (key === "language_tag") {
      normalized[key] = "en_IN";
    } else {
      normalized[key] = normalizeAmazonMetadata(child, marketplaceId);
    }
  }

  return normalized;
}

function buildMappedAttribute(
  attributeName: string,
  mapping: AmazonListingFieldMapping,
  product: AmazonListingProductInput,
  variant: AmazonListingVariantInput,
) {
  if (mapping.source === "manual") return parseManualValue(mapping.value ?? "");

  const value = getSourceValue(mapping.source, product, variant);
  if (value === null || value === undefined || value === "") return null;

  const stringValue = String(value);
  const marketplaceId = getAmazonMarketplaceId();

  if (["item_name", "product_description", "brand"].includes(attributeName)) {
    return localizedValue(stringValue, marketplaceId);
  }
  if (attributeName === "item_type_keyword") return marketplaceValue(stringValue, marketplaceId);

  return stringValue;
}

/**
 * Build an Amazon listing payload from canonical Dizito data plus explicit
 * field mappings supplied by the user. Unknown Amazon fields are never
 * guessed; they must be supplied as a manual value (plain text or JSON).
 */
export function buildAmazonListingDraft(
  product: AmazonListingProductInput,
  variant: AmazonListingVariantInput,
  productType: string,
  fieldMappings: Record<string, AmazonListingFieldMapping> = {},
): AmazonListingDraft {
  const marketplaceId = getAmazonMarketplaceId();
  const attributes: Record<string, unknown> = {
    item_name: localizedValue(product.name, marketplaceId),
  };

  // These canonical fields are only included when they have a direct,
  // product-level Amazon representation. Category is deliberately not
  // converted to item_type_keyword automatically because Amazon product
  // types can reject that attribute as not applicable.
  if (product.brand?.trim()) {
    attributes.brand = localizedValue(product.brand.trim(), marketplaceId);
  }
  if (product.description?.trim()) {
    attributes.product_description = localizedValue(product.description.trim(), marketplaceId);
  }

  for (const [attributeName, mapping] of Object.entries(fieldMappings)) {
    const mappedValue = buildMappedAttribute(attributeName, mapping, product, variant);
    if (mappedValue !== null) attributes[attributeName] = mappedValue;
    else delete attributes[attributeName];
  }

  return {
    sku: variant.sku,
    productType: productType.trim(),
    requirements: "LISTING",
    attributes: normalizeAmazonMetadata(attributes, marketplaceId) as Record<string, unknown>,
  };
}

interface AmazonListingsItemResponse {
  sku?: string;
  status?: string;
  submissionId?: string;
  issues?: unknown[];
}

export async function previewAmazonListing(
  channelId: string,
  sellerId: string,
  draft: AmazonListingDraft,
) {
  return amazonSpApiRequest<AmazonListingsItemResponse>(channelId, {
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(draft.sku)}`,
    query: {
      marketplaceIds: getAmazonMarketplaceId(),
      issueLocale: "en_IN",
      mode: "VALIDATION_PREVIEW",
    },
    body: {
      productType: draft.productType,
      requirements: draft.requirements,
      attributes: draft.attributes,
    },
  });
}

/**
 * Publish a validated Amazon listing. The caller must gate this operation
 * behind a successful validation preview; this function performs the live
 * Listings Items PUT and does not create or modify a Dizito listing record.
 */
export async function publishAmazonListing(
  channelId: string,
  sellerId: string,
  draft: AmazonListingDraft,
) {
  return amazonSpApiRequest<AmazonListingsItemResponse>(channelId, {
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(draft.sku)}`,
    query: {
      marketplaceIds: getAmazonMarketplaceId(),
      issueLocale: "en_IN",
    },
    body: {
      productType: draft.productType,
      requirements: draft.requirements,
      attributes: draft.attributes,
    },
  });
}
