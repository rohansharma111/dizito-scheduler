import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { pool } from "@/lib/db";
import { getWooCommerceChannelConfig, getWooCommerceProduct } from "@/lib/platforms/woocommerce/client";

export interface ReconcileWooCommercePublishInput {
  channelId: string;
  listingId: string;
  idempotencyKey: string;
  externalId: string;
}

export async function reconcileWooCommercePublish(userId: number, input: ReconcileWooCommercePublishInput) {
  const channel = await getCommerceChannelById(input.channelId, userId);
  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "woocommerce") return { error: "INVALID_PROVIDER" as const };

  const attemptResult = await pool.query(
    `SELECT id, status
     FROM commerce_publish_attempts
     WHERE channel_id = $1 AND listing_id = $2 AND idempotency_key = $3
       AND user_id = $4
     LIMIT 1`,
    [input.channelId, input.listingId, input.idempotencyKey.trim(), userId],
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) return { error: "PUBLISH_ATTEMPT_NOT_FOUND" as const };
  if (attempt.status === "succeeded") return { error: "PUBLISH_ATTEMPT_ALREADY_RECONCILED" as const };

  const listingResult = await pool.query(
    `SELECT id
     FROM product_listings
     WHERE id = $1 AND channel_id = $2 AND user_id = $3
     LIMIT 1`,
    [input.listingId, input.channelId, userId],
  );
  if (!listingResult.rows[0]) return { error: "LISTING_NOT_FOUND" as const };

  try {
    const { config } = await getWooCommerceChannelConfig(input.channelId);
    const product = await getWooCommerceProduct(config, input.externalId.trim());
    const providerId = product && product.id != null ? String(product.id) : null;
    if (!providerId || providerId !== input.externalId.trim()) return { error: "PROVIDER_PRODUCT_NOT_FOUND" as const };

    await pool.query(
      `UPDATE product_listings
       SET status = 'active', sync_status = 'synced', external_id = $1,
           last_synced_at = now(), last_error = NULL, updated_at = now()
       WHERE id = $2 AND user_id = $3`,
      [providerId, input.listingId, userId],
    );
    await pool.query(
      `UPDATE commerce_publish_attempts
       SET status = 'succeeded', response_payload = $1::jsonb, external_id = $2,
           completed_at = now(), updated_at = now()
       WHERE id = $3 AND user_id = $4`,
      [JSON.stringify(product), providerId, attempt.id, userId],
    );

    return { product, externalId: providerId, reconciled: true };
  } catch (error) {
    return { error: "RECONCILIATION_FAILED" as const, message: error instanceof Error ? error.message : "WooCommerce reconciliation failed" };
  }
}
