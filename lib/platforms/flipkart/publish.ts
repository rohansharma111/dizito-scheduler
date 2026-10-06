import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  markCommercePublishOperationFailed,
  markCommercePublishOperationStarted,
  markCommercePublishOperationSucceeded,
  markCommercePublishOperationUnknown,
  prepareCommercePublishOperation,
  type CommercePublishOperation,
} from "@/lib/commerce/publish/operations";
import { getFlipkartChannelConfig, flipkartRequest } from "@/lib/platforms/flipkart/client";
import {
  buildFlipkartListingMutationPayload,
  type FlipkartListingMutationInput,
} from "@/lib/platforms/flipkart/listing-payload";

export interface PrepareFlipkartPublishInput {
  channelId: string;
  listingId: string;
  operation?: Extract<CommercePublishOperation, "create" | "update">;
  idempotencyKey: string;
  listing: FlipkartListingMutationInput;
}

export async function prepareFlipkartListingPublish(
  userId: number,
  input: PrepareFlipkartPublishInput,
) {
  const channel = await getCommerceChannelById(input.channelId, userId);

  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "flipkart") return { error: "INVALID_PROVIDER" as const };
  if (channel.status !== "active") return { error: "CHANNEL_NOT_ACTIVE" as const };
  if (!input.idempotencyKey.trim()) {
    return { error: "IDEMPOTENCY_KEY_REQUIRED" as const };
  }

  const payload = buildFlipkartListingMutationPayload(input.listing);
  const operation = await prepareCommercePublishOperation({
    userId,
    listingId: input.listingId,
    provider: "flipkart",
    operation: input.operation ?? "create",
    idempotencyKey: input.idempotencyKey.trim(),
    requestPayload: payload,
  });

  if ("error" in operation) return operation;

  return {
    channelId: input.channelId,
    listingId: input.listingId,
    payload,
    operation: operation.operation,
    livePublishEnabled: false as const,
  };
}

export async function executePreparedFlipkartPublish(
  userId: number,
  input: {
    channelId: string;
    operationId: string;
    operation: Extract<CommercePublishOperation, "create" | "update">;
    payload: Record<string, unknown>;
  },
) {
  // Fail closed until sandbox/production mutation execution is explicitly enabled.
  if (process.env.FLIPKART_LIVE_PUBLISH_ENABLED !== "true") {
    return {
      status: "disabled" as const,
      operationId: input.operationId,
    };
  }

  const started = await markCommercePublishOperationStarted(userId, input.operationId);
  if (!started) {
    return { status: "OPERATION_NOT_FOUND" as const };
  }

  try {
    const { config } = await getFlipkartChannelConfig(input.channelId, userId);
    const path = input.operation === "create"
      ? "listings/v3"
      : "listings/v3/update";

    const response = await flipkartRequest<unknown>(config, path, {
      method: "POST",
      body: JSON.stringify(input.payload),
    });

    // Do not mark success until a reconciliation step confirms the external ID.
    return {
      status: "submitted" as const,
      operationId: input.operationId,
      response,
      reconciliationRequired: true as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Flipkart publish failed";
    const isTimeout = message.includes("timed out");

    if (isTimeout) {
      await markCommercePublishOperationUnknown(userId, input.operationId, message);
      return {
        status: "unknown" as const,
        operationId: input.operationId,
        reconciliationRequired: true as const,
      };
    }

    await markCommercePublishOperationFailed(userId, input.operationId, message);
    return {
      status: "failed" as const,
      operationId: input.operationId,
    };
  }
}

export async function confirmPreparedFlipkartPublish(
  userId: number,
  operationId: string,
  externalId: string,
) {
  const result = await markCommercePublishOperationSucceeded(
    userId,
    operationId,
    externalId.trim(),
  );

  return result
    ? { status: "succeeded" as const, operation: result }
    : { status: "OPERATION_NOT_FOUND" as const };
}
