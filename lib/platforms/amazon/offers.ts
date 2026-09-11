import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { amazonSpApiRequest } from "@/lib/platforms/amazon/client";
import type { AmazonListingSchemaSummary, AmazonSchemaProperty } from "@/lib/platforms/amazon/schema";

export type AmazonOfferCondition = "new_new" | "used_like_new" | "used_very_good" | "used_good" | "used_acceptable";
export type AmazonOfferFulfillment = "DEFAULT" | "AMAZON_IN";

export interface AmazonOfferDraft {
  sku: string;
  productType: string;
  requirements: "LISTING_OFFER_ONLY";
  attributes: Record<string, unknown>;
}

interface AmazonOfferResponse {
  sku?: string;
  status?: string;
  submissionId?: string;
  issues?: unknown[];
}

function marketplaceValue(value: unknown, marketplaceId: string) {
  return [{ value, marketplace_id: marketplaceId }];
}

function accepts(schema: AmazonSchemaProperty | undefined, value: unknown) {
  if (!schema) return true;
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) return false;
  return true;
}

function selectorValue(schema: AmazonSchemaProperty | undefined, preferred: unknown) {
  if (accepts(schema, preferred)) return preferred;
  if (schema?.enum?.length) return schema.enum[0];
  return preferred;
}

function schemaProperties(schema: AmazonSchemaProperty | undefined) {
  return schema?.properties ?? {};
}

function buildPurchasableOffer(schema: AmazonSchemaProperty | undefined, price: number, marketplaceId: string) {
  const itemSchema = schema?.items;
  const properties = schemaProperties(itemSchema);
  const offer: Record<string, unknown> = {};

  if (properties.audience || itemSchema?.required?.includes("audience")) {
    offer.audience = selectorValue(properties.audience, "ALL");
  }
  if (properties.marketplace_id || itemSchema?.required?.includes("marketplace_id")) {
    offer.marketplace_id = marketplaceId;
  }
  if (properties.currency || itemSchema?.required?.includes("currency")) {
    offer.currency = selectorValue(properties.currency, "INR");
  }
  if (properties.our_price || itemSchema?.required?.includes("our_price") || !schema) {
    const priceSchema = properties.our_price;
    const scheduleSchema = priceSchema?.items?.properties?.schedule;
    const valueSchema = scheduleSchema?.items?.properties?.value_with_tax;
    const schedule: Record<string, unknown> = { value_with_tax: price };
    if (!accepts(valueSchema, price)) {
      throw new Error("Amazon's purchasable_offer schema does not accept the configured offer price");
    }
    offer.our_price = [{ schedule: [schedule] }];
  }

  return [offer];
}

function buildFulfillmentAvailability(schema: AmazonSchemaProperty | undefined, quantity: number, channel: AmazonOfferFulfillment, marketplaceId: string) {
  const itemSchema = schema?.items;
  const properties = schemaProperties(itemSchema);
  const availability: Record<string, unknown> = {};
  if (properties.fulfillment_channel_code || itemSchema?.required?.includes("fulfillment_channel_code") || !schema) availability.fulfillment_channel_code = selectorValue(properties.fulfillment_channel_code, channel);
  if (properties.quantity || itemSchema?.required?.includes("quantity") || !schema) availability.quantity = quantity;
  if (properties.marketplace_id || itemSchema?.required?.includes("marketplace_id")) availability.marketplace_id = marketplaceId;
  return [availability];
}

function identifierTypeForBarcode(schema: AmazonSchemaProperty | undefined, barcode: string) {
  const typeSchema = schema?.items?.properties?.type;
  const values = typeSchema?.enum?.filter((value): value is string => typeof value === "string") ?? [];
  if (!values.length) return null;
  const digits = barcode.replace(/[^0-9]/g, "");
  const normalized = values.map((value) => ({ value, key: value.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const preferredKeys = digits.length === 13
    ? ["ean", "gtin13", "gtin"]
    : digits.length === 12
      ? ["upc", "gtin12", "gtin"]
      : digits.length === 14
        ? ["gtin14", "gtin"]
        : digits.length === 8
          ? ["ean8", "gtin8", "ean", "gtin"]
          : [];
  return normalized.find((item) => preferredKeys.includes(item.key))?.value ?? null;
}

function buildExternalProductIdentifier(schema: AmazonSchemaProperty | undefined, barcode: string, marketplaceId: string) {
  const itemSchema = schema?.items;
  const properties = schemaProperties(itemSchema);
  const type = identifierTypeForBarcode(schema, barcode);
  if (!type && properties.type?.enum?.length) return null;

  const identifier: Record<string, unknown> = {
    value: barcode,
  };
  if (type) identifier.type = type;
  if (properties.marketplace_id || itemSchema?.required?.includes("marketplace_id")) identifier.marketplace_id = marketplaceId;
  return [identifier];
}

export function buildAmazonOfferDraft(input: {
  sku: string;
  productType: string;
  price: number;
  quantity: number;
  condition: AmazonOfferCondition;
  fulfillmentChannelCode: AmazonOfferFulfillment;
  asin?: string | null;
  barcode?: string | null;
  attributes?: Record<string, unknown>;
  schemaSummary?: AmazonListingSchemaSummary | null;
}): AmazonOfferDraft {
  const marketplaceId = getAmazonMarketplaceId();
  if (!input.sku.trim()) throw new Error("SKU is required for the Amazon offer");
  if (!input.productType.trim()) throw new Error("Product type is required for the Amazon offer");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("Offer price must be greater than zero");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) throw new Error("Offer quantity must be a non-negative integer");

  const schema = input.schemaSummary?.properties ?? {};
  const attributes: Record<string, unknown> = { ...(input.attributes ?? {}) };

  if (schema.condition_type || !input.schemaSummary) attributes.condition_type = marketplaceValue(input.condition, marketplaceId);
  if (schema.purchasable_offer || !input.schemaSummary) attributes.purchasable_offer = buildPurchasableOffer(schema.purchasable_offer, input.price, marketplaceId);
  if (schema.fulfillment_availability || !input.schemaSummary) attributes.fulfillment_availability = buildFulfillmentAvailability(schema.fulfillment_availability, input.quantity, input.fulfillmentChannelCode, marketplaceId);

  if (input.asin?.trim() && (schema.merchant_suggested_asin || !input.schemaSummary)) {
    attributes.merchant_suggested_asin = marketplaceValue(input.asin.trim().toUpperCase(), marketplaceId);
  }

  const barcode = input.barcode?.trim();
  if (barcode && (schema.externally_assigned_product_identifier || !input.schemaSummary)) {
    const identifier = buildExternalProductIdentifier(schema.externally_assigned_product_identifier, barcode, marketplaceId);
    if (identifier) attributes.externally_assigned_product_identifier = identifier;
  }

  return {
    sku: input.sku.trim(),
    productType: input.productType.trim(),
    requirements: "LISTING_OFFER_ONLY",
    attributes,
  };
}

export async function previewAmazonOffer(channelId: string, sellerId: string, draft: AmazonOfferDraft) {
  return amazonSpApiRequest<AmazonOfferResponse>(channelId, {
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
