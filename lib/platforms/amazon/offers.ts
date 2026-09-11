import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { amazonSpApiRequest } from "@/lib/platforms/amazon/client";

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

export function buildAmazonOfferDraft(input: {
  sku: string;
  productType: string;
  price: number;
  quantity: number;
  condition: AmazonOfferCondition;
  fulfillmentChannelCode: AmazonOfferFulfillment;
  asin?: string | null;
  externalProductId?: string | null;
  externalProductIdType?: string | null;
  attributes?: Record<string, unknown>;
}): AmazonOfferDraft {
  const marketplaceId = getAmazonMarketplaceId();
  if (!input.sku.trim()) throw new Error("SKU is required for the Amazon offer");
  if (!input.productType.trim()) throw new Error("Product type is required for the Amazon offer");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("Offer price must be greater than zero");
  if (!Number.isInteger(input.quantity) || input.quantity < 0) throw new Error("Offer quantity must be a non-negative integer");

  const attributes: Record<string, unknown> = {
    ...(input.attributes ?? {}),
    condition_type: marketplaceValue(input.condition, marketplaceId),
    purchasable_offer: [{
      audience: "ALL",
      currency: "INR",
      our_price: [{ schedule: [{ value_with_tax: input.price }] }],
      marketplace_id: marketplaceId,
    }],
    fulfillment_availability: [{
      fulfillment_channel_code: input.fulfillmentChannelCode,
      quantity: input.quantity,
    }],
  };

  if (input.asin?.trim()) {
    attributes.merchant_suggested_asin = marketplaceValue(input.asin.trim().toUpperCase(), marketplaceId);
  }

  if (input.externalProductId?.trim()) {
    attributes.externally_assigned_product_identifier = [{
      value: input.externalProductId.trim(),
      type: input.externalProductIdType?.trim() || "EAN",
      marketplace_id: marketplaceId,
    }];
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
