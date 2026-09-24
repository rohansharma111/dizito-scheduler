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
  idempotencyKey?: string;
}

function isAmbiguousPublishError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|network/i.test(message);
}

export async function publishWooCommerceProduct(userId: number, input: PublishWooCommerceProductInput) {
  if (input.confirmLivePublish !== true) return { error: "LIVE_PUBLISH_CONFIRMATION_REQUIRED" as const };

  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (!idempotencyKey) return { error: "IDEMPOTENCY_KEY_REQUIRED" as const };

  const channel = await getCommerceChannelById(input.channelId, userId);
  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "woocommerce") return { error: "INVALID_PROVIDER" as const };

  const listingResult = await pool.query(
    `SELECT id, status, sync_status, external_id, publish_idempotency_key
     FROM product_listings
     WHERE id = $1 AND channel_id = $2 AND user_id = $3 LIMIT 1`,
    [input.listingId, input.channelId, userId],
  );

  const listing = listingResult.rows[0];
  if (!listing) return { error: "LISTING_NOT_FOUND" as const };
  if (listing.external_id) return { error: "LISTING_ALREADY_PUBLISHED" as const };
  if (listing.publish_idempotency_key && listing.publish_idempotency_key !== idempotencyKey) {
    return { error: "LISTING_IDEMPOTENCY_KEY_MISMATCH" as const };
  }

  let existingAttempt: { id: string; status: string; external_id: string | null; response_payload: unknown } | null = null;
  const attemptResult = await pool.query(
    `SELECT id, status, external_id, response_payload
     FROM commerce_publish_attempts
     WHERE channel_id = $1 AND listing_id = $2 AND idempotency_key = $3
     LIMIT 1`,
    [input.channelId, input.listingId, idempotencyKey],
  );
  existingAttempt = attemptResult.rows[0] ?? null;
  if (existingAttempt?.status === "succeeded" && existingAttempt.external_id) {
    await pool.query(
      `UPDATE product_listings
       SET status = 'active', sync_status = 'synced', external_id = $1,
           last_synced_at = COALESCE(last_synced_at, now()), last_error = NULL, updated_at = now()
       WHERE id = $2 AND user_id = $3`,
      [existingAttempt.external_id, input.listingId, userId],
    );
    return { result: existingAttempt.response_payload, externalId: existingAttempt.external_id, idempotentReplay: true };
  }
  if (existingAttempt && ["started", "ambiguous"].includes(existingAttempt.status)) {
    return { error: "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION" as const };
  }

  await pool.query(
    `UPDATE product_listings
     SET sync_status = 'syncing',
         publish_idempotency_key = COALESCE(publish_idempotency_key, $1),
         last_error = NULL,
         updated_at = now()
     WHERE id = $2 AND user_id = $3`,
    [idempotencyKey, input.listingId, userId],
  );

  const attempt = await pool.query(
    `INSERT INTO commerce_publish_attempts
      (user_id, channel_id, listing_id, provider, idempotency_key, status, request_payload)
     VALUES ($1, $2, $3, $4, $5, 'started', $6::jsonb)
     ON CONFLICT (channel_id, listing_id, idempotency_key)
     DO UPDATE SET status = 'started', request_payload = EXCLUDED.request_payload,
                   error_message = NULL, completed_at = NULL, updated_at = now()
     RETURNING id`,
    [userId, input.channelId, input.listingId, channel.provider, idempotencyKey, JSON.stringify(input.payload)],
  );
  const attemptId = String(attempt.rows[0].id);

  try {
    const { config } = await getWooCommerceChannelConfig(input.channelId);
    const result = await createWooCommerceProduct(config, { ...input.payload, status: "publish" });
    const externalId = result && typeof result === "object" && "id" in result
      ? String((result as { id: number | string }).id)
      : null;

    if (!externalId) throw new Error("WooCommerce publish response did not include a product id");

    await pool.query(
      `UPDATE product_listings
       SET status = 'active', sync_status = 'synced', external_id = $1,
           last_synced_at = now(), last_error = NULL, updated_at = now()
       WHERE id = $2 AND user_id = $3`,
      [externalId, input.listingId, userId],
    );

    await pool.query(
      `UPDATE commerce_publish_attempts
       SET status = 'succeeded', response_payload = $1::jsonb, external_id = $2,
           completed_at = now(), updated_at = now()
       WHERE id = $3`,
      [JSON.stringify(result), externalId, attemptId],
    );

    return { result, externalId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WooCommerce publish failed";
    const ambiguous = isAmbiguousPublishError(error);
    await pool.query(
      `UPDATE product_listings SET sync_status = $1, last_error = $2, updated_at = now()
       WHERE id = $3 AND user_id = $4`,
      [ambiguous ? "syncing" : "error", message, input.listingId, userId],
    );
    await pool.query(
      `UPDATE commerce_publish_attempts
       SET status = $1, error_message = $2, completed_at = now(), updated_at = now()
       WHERE id = $3`,
      [ambiguous ? "ambiguous" : "failed", message, attemptId],
    );
    if (!ambiguous) await markWooCommerceChannelError(input.channelId, userId, message);
    throw error;
  }
}
