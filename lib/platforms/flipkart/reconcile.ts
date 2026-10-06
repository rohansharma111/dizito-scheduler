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
  externalId?: string;
  lookupKey?: string;
}

function extractConfirmedExternalId(providerResult: unknown): string | null {
  if (!providerResult || typeof providerResult !== "object") return null;
  const candidate = providerResult as Record<string, unknown>;
  const direct = candidate.externalId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const response = candidate.response ?? candidate.data ?? candidate.result;
  if (!response || typeof response !== "object") return null;
  const nested = response as Record<string, unknown>;
  for (const key of ["listingId", "listing_id", "id", "listingID"]) {
    const value = nested[key];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return null;
}

export interface FlipkartReconciliationResult {
  operationId: string;
  listingId: string;
  provider: "flipkart";
  status: CommercePublishOperationStatus;
  providerResult: unknown;
  externalIdConfirmed: boolean;
  externalId?: string;
}

export async function reconcileFlipkartPublishOperation(
  userId: number,
  input: ReconcileFlipkartOperationInput,
): Promise<FlipkartReconciliationResult> {
  if (input.skuIds.length === 0) {
    throw new Error("Flipkart reconciliation requires at least one SKU");
  }

  const { config } = await getFlipkartChannelConfig(input.channelId, userId);
  const providerResult = await getFlipkartListings(
    config,
    input.skuIds.length > 0
      ? input.skuIds
      : input.lookupKey
        ? [input.lookupKey]
        : [],
  );

  // Flipkart's API response shape can vary by listing state/account data.
  // Do not infer success from an HTTP 200 alone. Only a concrete provider
  // identifier is eligible to transition a publish operation to succeeded.
  const confirmedExternalId =
    input.externalId?.trim() || extractConfirmedExternalId(providerResult);

  return {
    operationId: input.operationId,
    listingId: input.listingId,
    provider: "flipkart",
    status: confirmedExternalId ? "succeeded" : "unknown",
    providerResult,
    externalIdConfirmed: Boolean(confirmedExternalId),
    ...(confirmedExternalId ? { externalId: confirmedExternalId } : {}),
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
