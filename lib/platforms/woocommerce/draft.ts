import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { upsertProductListingDraft } from "@/lib/commerce/listings/draft";
import {
  buildWooCommerceProductPayload,
  type WooCommerceProductInput,
} from "@/lib/platforms/woocommerce/mapper";

export interface PrepareWooCommerceDraftInput {
  channelId: string;
  productId: string;
  product: WooCommerceProductInput;
  variants: Array<{
    variantId: string;
    externalId?: string | null;
    providerMetadata?: Record<string, unknown>;
  }>;
  providerMetadata?: Record<string, unknown>;
}

export async function prepareWooCommerceListingDraft(
  userId: number,
  input: PrepareWooCommerceDraftInput,
) {
  const channel = await getCommerceChannelById(input.channelId, userId);

  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "woocommerce") {
    return { error: "INVALID_PROVIDER" as const };
  }

  const payload = buildWooCommerceProductPayload({
    ...input.product,
    status: "draft",
  });

  const result = await upsertProductListingDraft(userId, {
    channelId: input.channelId,
    productId: input.productId,
    providerMetadata: {
      ...(input.providerMetadata ?? {}),
      woocommerce: {
        mode: "draft",
        payload,
        preparedAt: new Date().toISOString(),
      },
    },
    variants: input.variants,
  });

  if ("error" in result) return result;

  return {
    listing: result.listing,
    payload,
  };
}
