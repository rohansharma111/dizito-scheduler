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
  if (Array.isArray(providerResult)) {
    for (const item of providerResult) {
      const id = extractConfirmedExternalId(item);
      if (id) return id;
    }
    return null;
  }

  if (!providerResult || typeof providerResult !== "object") return null;

  const candidate = providerResult as Record<string, unknown>;
  for (const key of ["externalId", "listingId", "listing_id", "id", "listingID"]) {
    const value = candidate[key];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }

  for (const key of ["listing", "listings", "response", "data", "result"]) {
    const nested = extractConfirmedExternalId(candidate[key]);
    if (nested) return nested;
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
  operation?: unknown;
}

export async function reconcileFlipkartPublishOperation(
  userId: number,
  input: ReconcileFlipkartOperationInput,
): Promise<FlipkartReconciliationResult> {
  const identifiers =
    input.skuIds.length > 0
      ? input.skuIds
      : input.lookupKey?.trim()
        ? [input.lookupKey.trim()]
        : [];

  if (identifiers.length === 0) {
    throw new Error("Flipkart reconciliation requires a SKU or lookup key");
  }

  const { config } = await getFlipkartChannelConfig(input.channelId, userId);
  const providerResult = await getFlipkartListings(config, identifiers);

  const confirmedExternalId = extractConfirmedExternalId(providerResult);
  const requestedExternalId = input.externalId?.trim();

  if (!confirmedExternalId) {
    return {
      operationId: input.operationId,
      listingId: input.listingId,
      provider: "flipkart",
      status: "unknown",
      providerResult,
      externalIdConfirmed: false,
    };
  }

  if (requestedExternalId && requestedExternalId !== confirmedExternalId) {
    throw new Error("Flipkart reconciliation external ID mismatch");
  }

  const operation = await markCommercePublishOperationSucceeded(
    userId,
    input.operationId,
    confirmedExternalId,
  );

  if (!operation) {
    throw new Error("PUBLISH_ATTEMPT_NOT_FOUND");
  }

  return {
    operationId: input.operationId,
    listingId: input.listingId,
    provider: "flipkart",
    status: "succeeded",
    providerResult,
    externalIdConfirmed: true,
    externalId: confirmedExternalId,
    operation,
  };
}

