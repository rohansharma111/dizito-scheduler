import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { pool } from "@/lib/db";
import { findWooCommerceProductsBySku, getWooCommerceChannelConfig, getWooCommerceProduct } from "@/lib/platforms/woocommerce/client";

export interface ReconcileWooCommercePublishInput {
  channelId: string;
  listingId: string;
  idempotencyKey: string;
  externalId?: string;
  sku?: string;
}

export async function reconcileWooCommercePublish(userId: number, input: ReconcileWooCommercePublishInput) {
  const idempotencyKey = input.idempotencyKey.trim();
  const externalId = input.externalId?.trim() || "";
  const sku = input.sku?.trim() || "";
  if (!idempotencyKey || (!externalId && !sku)) return { error: "RECONCILIATION_IDENTIFIER_REQUIRED" as const };

  const channel = await getCommerceChannelById(input.channelId, userId);
  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };
  if (channel.provider !== "woocommerce") return { error: "INVALID_PROVIDER" as const };

  const attemptResult = await pool.query(
    `SELECT id, status
     FROM commerce_publish_attempts
     WHERE channel_id = $1 AND listing_id = $2 AND idempotency_key = $3
       AND user_id = $4
     LIMIT 1`,
    [input.channelId, input.listingId, idempotencyKey, userId],
  );
  const attempt = attemptResult.rows[0];
  if (!attempt) return { error: "PUBLISH_ATTEMPT_NOT_FOUND" as const };
  if (attempt.status === "succeeded") return { error: "PUBLISH_ATTEMPT_ALREADY_RECONCILED" as const };
  if (!["started", "ambiguous"].includes(attempt.status)) return { error: "PUBLISH_ATTEMPT_NOT_RECONCILABLE" as const };

  const listingResult = await pool.query(
    `SELECT id, publish_idempotency_key
     FROM product_listings
     WHERE id = $1 AND channel_id = $2 AND user_id = $3
     LIMIT 1`,
    [input.listingId, input.channelId, userId],
  );
  const listing = listingResult.rows[0];
  if (!listing) return { error: "LISTING_NOT_FOUND" as const };
  if (listing.publish_idempotency_key !== idempotencyKey) return { error: "LISTING_IDEMPOTENCY_KEY_MISMATCH" as const };

  try {
    const { config } = await getWooCommerceChannelConfig(input.channelId);
    let product: Record<string, unknown> | null = null;
    if (externalId) {
      product = await getWooCommerceProduct(config, externalId);
    } else {
      const matches = await findWooCommerceProductsBySku(config, sku);
      if (matches.length === 0) return { error: "PROVIDER_PRODUCT_NOT_FOUND" as const };
      if (matches.length > 1) return { error: "MULTIPLE_PROVIDER_PRODUCTS_FOUND" as const };
      product = matches[0];
    }

    const providerId = product && product.id != null ? String(product.id) : null;
    if (!providerId || (externalId && providerId !== externalId)) return { error: "PROVIDER_PRODUCT_NOT_FOUND" as const };
    if (sku && String(product?.sku ?? "") !== sku) return { error: "PROVIDER_SKU_MISMATCH" as const };

    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const lockedAttempt = await db.query(
        `SELECT id, status
         FROM commerce_publish_attempts
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [attempt.id, userId],
      );
      const currentAttempt = lockedAttempt.rows[0];
      if (!currentAttempt) {
        await db.query("ROLLBACK");
        return { error: "PUBLISH_ATTEMPT_NOT_FOUND" as const };
      }
      if (currentAttempt.status === "succeeded") {
        await db.query("ROLLBACK");
        return { error: "PUBLISH_ATTEMPT_ALREADY_RECONCILED" as const };
      }
      if (!["started", "ambiguous"].includes(currentAttempt.status)) {
        await db.query("ROLLBACK");
        return { error: "PUBLISH_ATTEMPT_NOT_RECONCILABLE" as const };
      }

      await db.query(
        `UPDATE product_listings
         SET status = 'active', sync_status = 'synced', external_id = $1,
             last_synced_at = now(), last_error = NULL, updated_at = now()
         WHERE id = $2 AND channel_id = $3 AND user_id = $4`,
        [providerId, input.listingId, input.channelId, userId],
      );
      await db.query(
        `UPDATE commerce_publish_attempts
         SET status = 'succeeded', response_payload = $1::jsonb, external_id = $2,
             completed_at = now(), updated_at = now()
         WHERE id = $3 AND user_id = $4`,
        [JSON.stringify(product), providerId, attempt.id, userId],
      );
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      db.release();
    }

    return { product, externalId: providerId, reconciled: true };
  } catch (error) {
    return { error: "RECONCILIATION_FAILED" as const, message: error instanceof Error ? error.message : "WooCommerce reconciliation failed" };
  }
}
