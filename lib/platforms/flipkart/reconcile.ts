import {
  getFlipkartChannelConfig,
  getFlipkartListings,
} from "@/lib/platforms/flipkart/client";
import {
  markCommercePublishOperationSucceeded,
  type CommercePublishOperationStatus,
} from "@/lib/commerce/publish/operations";

export interface ReconcileFlipkartOperationInput {
  channelId: string;
  operationId: string;
  listingId: string;
  skuIds: string[];
}

export interface FlipkartReconciliationResult {
  operationId: string;
  listingId: string;
  provider: "flipkart";
  status: CommercePublishOperationStatus;
  providerResult: unknown;
  externalIdConfirmed: boolean;
}

export async function reconcileFlipkartPublishOperation(
  userId: number,
  input: ReconcileFlipkartOperationInput,
): Promise<FlipkartReconciliationResult> {
  if (input.skuIds.length === 0) {
    throw new Error("Flipkart reconciliation requires at least one SKU");
  }

  const { config } = await getFlipkartChannelConfig(input.channelId, userId);
  const providerResult = await getFlipkartListings(config, input.skuIds);

  // Flipkart's API response shape can vary by listing state/account data.
  // Do not infer success from an HTTP 200 alone. A caller must explicitly
  // identify the created/updated external listing ID before marking success.
  return {
    operationId: input.operationId,
    listingId: input.listingId,
    provider: "flipkart",
    status: "unknown",
    providerResult,
    externalIdConfirmed: false,
  };
}

export async function confirmFlipkartPublishOperation(
  userId: number,
  operationId: string,
  externalId: string,
) {
  const normalizedExternalId = externalId.trim();
  if (!normalizedExternalId) {
    throw new Error("Flipkart external ID is required");
  }

  return markCommercePublishOperationSucceeded(
    userId,
    operationId,
    normalizedExternalId,
  );
}
