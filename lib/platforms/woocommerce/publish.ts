import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { pool } from "@/lib/db";
import {
  createWooCommerceProduct,
  getWooCommerceChannelConfig,
  markWooCommerceChannelError,
} from "@/lib/platforms/woocommerce/client";

export interface PublishWooCommerceProductInput {
  channelId: string;
  listingId: string;
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

  const listingResult = await pool.query(
    `
    SELECT id, status, sync_status, external_id
    FROM product_listings
    WHERE id = $1
      AND channel_id = $2
      AND user_id = $3
    LIMIT 1
    `,
    [input.listingId, input.channelId, userId],
  );

  const listing = listingResult.rows[0];
  if (!listing) return { error: "LISTING_NOT_FOUND" as const };
  if (listing.external_id) return { error: "LISTING_ALREADY_PUBLISHED" as const };

  const payload = { ...input.payload, status: "publish" };

  await pool.query(
    `
    UPDATE product_listings
    SET sync_status = 'syncing', last_error = NULL, updated_at = now()
    WHERE id = $1 AND user_id = $2
    `,
    [input.listingId, userId],
  );

  try {
    const { config } = await getWooCommerceChannelConfig(input.channelId);
    const result = await createWooCommerceProduct(config, payload);
    const externalId = result && typeof result === "object" && "id" in result
      ? String((result as { id: number | string }).id)
      : null;

    if (!externalId) {
      throw new Error("WooCommerce publish response did not include a product id");
    }

    await pool.query(
      `
      UPDATE product_listings
      SET
        status = 'active',
        sync_status = 'synced',
        external_id = $1,
        last_synced_at = now(),
        last_error = NULL,
        updated_at = now()
      WHERE id = $2 AND user_id = $3
      `,
      [externalId, input.listingId, userId],
    );

    return { result, externalId };
  } catch (error) {
    await pool.query(
      `
      UPDATE product_listings
      SET sync_status = 'error', last_error = $1, updated_at = now()
      WHERE id = $2 AND user_id = $3
      `,
      [error instanceof Error ? error.message : "WooCommerce publish failed", input.listingId, userId],
    );
    await markWooCommerceChannelError(
      input.channelId,
      userId,
      error instanceof Error ? error.message : "WooCommerce publish failed",
    );
    throw error;
  }
}
