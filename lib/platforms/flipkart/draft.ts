import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { upsertProductListingDraft } from "@/lib/commerce/listings/draft";
import {
  buildFlipkartDraftMapping,
  type FlipkartProductMappingInput,
} from "@/lib/platforms/flipkart/mapper";

export interface PrepareFlipkartListingDraftInput {
  channelId: string;
  product: FlipkartProductMappingInput;
  variants: Array<{
    variantId: string;
    externalId?: string | null;
    providerMetadata?: Record<string, unknown>;
  }>;
  providerMetadata?: Record<string, unknown>;
}

export async function prepareFlipkartListingDraft(
  userId: number,
  input: PrepareFlipkartListingDraftInput,
) {
  const channel = await getCommerceChannelById(input.channelId, userId);

  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "flipkart") {
    return { error: "INVALID_PROVIDER" as const };
  }

  const mapping = buildFlipkartDraftMapping(input.product);

  const productVariantIds = new Set(mapping.variants.map((variant) => variant.variantId));
  const selectedVariantIds = new Set(input.variants.map((variant) => variant.variantId));

  for (const variantId of productVariantIds) {
    if (!selectedVariantIds.has(variantId)) {
      throw new Error(`Flipkart draft mapping variant ${variantId} is not persisted`);
    }
  }

  const result = await upsertProductListingDraft(userId, {
    channelId: input.channelId,
    productId: input.product.productId,
    providerMetadata: {
      ...(input.providerMetadata ?? {}),
      flipkart: {
        mode: "draft",
        mapping,
        publishReady: false,
        preparedAt: new Date().toISOString(),
      },
    },
    variants: input.variants,
  });

  if ("error" in result) return result;

  return {
    listing: result.listing,
    mapping,
    publishReady: false,
  };
}
