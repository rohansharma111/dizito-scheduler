import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  createWooCommerceProduct,
  getWooCommerceChannelConfig,
  markWooCommerceChannelError,
} from "@/lib/platforms/woocommerce/client";

export interface PublishWooCommerceProductInput {
  channelId: string;
  payload: Record<string, unknown>;
  confirmLivePublish: boolean;
}

export async function publishWooCommerceProduct(
  userId: number,
  input: PublishWooCommerceProductInput,
) {
  if (input.confirmLivePublish !== true) {
    return { error: "LIVE_PUBLISH_CONFIRMATION_REQUIRED" as const };
  }

  const channel = await getCommerceChannelById(input.channelId, userId);
  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "woocommerce") return { error: "INVALID_PROVIDER" as const };

  const payload = { ...input.payload, status: "publish" };

  try {
    const { config } = await getWooCommerceChannelConfig(input.channelId);
    const result = await createWooCommerceProduct(config, payload);
    return { result };
  } catch (error) {
    await markWooCommerceChannelError(
      input.channelId,
      userId,
      error instanceof Error ? error.message : "WooCommerce publish failed",
    );
    throw error;
  }
}
