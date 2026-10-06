import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  prepareCommercePublishOperation,
  type CommercePublishOperation,
} from "@/lib/commerce/publish/operations";
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
  if (channel.provider !== "flipkart") {
    return { error: "INVALID_PROVIDER" as const };
  }
  if (channel.status !== "active") {
    return { error: "CHANNEL_NOT_ACTIVE" as const };
  }

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
