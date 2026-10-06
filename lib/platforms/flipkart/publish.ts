import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  buildFlipkartListingMutationPayload,
  type FlipkartListingMutationInput,
} from "@/lib/platforms/flipkart/listing-payload";

export interface PrepareFlipkartPublishInput {
  channelId: string;
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

  const payload = buildFlipkartListingMutationPayload(input.listing);

  return {
    channelId: input.channelId,
    payload,
    livePublishEnabled: false as const,
  };
}
