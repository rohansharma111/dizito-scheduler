import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { amazonSpApiRequest, type AmazonListingRequirements } from "@/lib/platforms/amazon/client";
import { buildAmazonExternalProductIdentifier, buildAmazonMerchantSuggestedAsin } from "@/lib/platforms/amazon/identity";

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
  requirements: AmazonListingRequirements;
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
  try { return JSON.parse(trimmed) as unknown; } catch { return trimmed; }
}

function getSourceValue(source: AmazonListingFieldSource, product: AmazonListingProductInput, variant: AmazonListingVariantInput) {
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
    if (key === "marketplace_id") normalized[key] = marketplaceId;
    else if (key === "language_tag") normalized[key] = "en_IN";
    else normalized[key] = normalizeAmazonMetadata(child, marketplaceId);
  }
  return normalized;
}

function buildMappedAttribute(attributeName: string, mapping: AmazonListingFieldMapping, product: AmazonListingProductInput, variant: AmazonListingVariantInput) {
  const marketplaceId = getAmazonMarketplaceId();
  if (mapping.source === "manual") {
    const manual = parseManualValue(mapping.value ?? "");
    if (manual === null) return null;
    if (attributeName === "externally_assigned_product_identifier") {
      if (!manual || typeof manual !== "object" || Array.isArray(manual)) {
        throw new Error("External product identifier must include a type and value.");
      }
      const identifier = manual as { type?: string; value?: string };
      if (!identifier.type || typeof identifier.value !== "string") {
        throw new Error("External product identifier must include a type and value.");
      }
      return buildAmazonExternalProductIdentifier({ type: identifier.type as "ean" | "upc" | "gtin" | "isbn", value: identifier.value }, marketplaceId);
    }
    if (attributeName === "merchant_suggested_asin") {
      if (typeof manual === "string") return buildAmazonMerchantSuggestedAsin(manual, marketplaceId);
      if (manual && typeof manual === "object" && !Array.isArray(manual)) {
        const asin = manual as { value?: string };
        if (typeof asin.value === "string") return buildAmazonMerchantSuggestedAsin(asin.value, marketplaceId);
      }
    }
    return manual;
  }

  const value = getSourceValue(mapping.source, product, variant);
  if (value === null || value === undefined || value === "") return null;
  const stringValue = String(value);
  if (["item_name", "product_description", "brand"].includes(attributeName)) return localizedValue(stringValue, marketplaceId);
  if (attributeName === "item_type_keyword") return marketplaceValue(stringValue, marketplaceId);
  if (attributeName === "externally_assigned_product_identifier") {
    throw new Error("External product identifiers must be entered with an identifier type; SKU or barcode alone is not assumed to be a valid Amazon identifier.");
  }
  if (attributeName === "merchant_suggested_asin") {
    throw new Error("Merchant Suggested ASIN must be entered explicitly; Dizito does not infer an ASIN from SKU or barcode.");
  }
  return stringValue;
}

function isProductIdentifierExemptionEnabled(value: unknown) {
  if (Array.isArray(value)) return value.some((item) => item && typeof item === "object" && (item as Record<string, unknown>).value === true);
  return value === true;
}

export function buildAmazonListingDraft(
  product: AmazonListingProductInput,
  variant: AmazonListingVariantInput,
  productType: string,
  fieldMappings: Record<string, AmazonListingFieldMapping> = {},
  requirements: AmazonListingRequirements = "LISTING_PRODUCT_ONLY",
): AmazonListingDraft {
  const marketplaceId = getAmazonMarketplaceId();
  const attributes: Record<string, unknown> = { item_name: localizedValue(product.name, marketplaceId) };
  if (product.brand?.trim()) attributes.brand = localizedValue(product.brand.trim(), marketplaceId);
  if (product.description?.trim()) attributes.product_description = localizedValue(product.description.trim(), marketplaceId);
  for (const [attributeName, mapping] of Object.entries(fieldMappings)) {
    const mappedValue = buildMappedAttribute(attributeName, mapping, product, variant);
    if (mappedValue !== null) attributes[attributeName] = mappedValue;
    else delete attributes[attributeName];
  }

  if (isProductIdentifierExemptionEnabled(attributes.supplier_declared_has_product_identifier_exemption)) {
    delete attributes.externally_assigned_product_identifier;
  }

  return {
    sku: variant.sku,
    productType: productType.trim(),
    requirements,
    attributes: normalizeAmazonMetadata(attributes, marketplaceId) as Record<string, unknown>,
  };
}

interface AmazonListingsItemResponse { sku?: string; status?: string; submissionId?: string; issues?: unknown[]; }

export async function previewAmazonListing(channelId: string, userId: number, sellerId: string, draft: AmazonListingDraft) {
  return amazonSpApiRequest<AmazonListingsItemResponse>(channelId, userId, {
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(draft.sku)}`,
    query: { marketplaceIds: getAmazonMarketplaceId(), issueLocale: "en_IN", mode: "VALIDATION_PREVIEW" },
    body: { productType: draft.productType, requirements: draft.requirements, attributes: draft.attributes },
  });
}

export async function publishAmazonListing(channelId: string, userId: number, sellerId: string, draft: AmazonListingDraft) {
  return amazonSpApiRequest<AmazonListingsItemResponse>(channelId, userId, {
    method: "PUT",
    path: `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(draft.sku)}`,
    query: { marketplaceIds: getAmazonMarketplaceId(), issueLocale: "en_IN" },
    body: { productType: draft.productType, requirements: draft.requirements, attributes: draft.attributes },
  });
}
