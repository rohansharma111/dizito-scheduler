import crypto from "node:crypto";
import { pool } from "@/lib/db";

export type CommercePublishOperation = "create" | "update" | "inventory" | "price";
export type CommercePublishOperationStatus =
  | "prepared"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "unknown";

export interface PreparePublishOperationInput {
  userId: number;
  listingId: string;
  provider: string;
  operation: CommercePublishOperation;
  idempotencyKey: string;
  requestPayload: unknown;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error("PUBLISH_OPERATION_PAYLOAD_INVALID");
    }
    return serialized;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`);

  return `{${entries.join(",")}}`;
}

function fingerprint(payload: unknown) {
  return crypto.createHash("sha256").update(stableSerialize(payload)).digest("hex");
}

export async function prepareCommercePublishOperation(input: PreparePublishOperationInput) {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return { error: "IDEMPOTENCY_KEY_INVALID" as const };
  }
  if (!input.listingId.trim() || !input.provider.trim()) {
    return { error: "PUBLISH_OPERATION_INPUT_INVALID" as const };
  }

  const requestFingerprint = fingerprint(input.requestPayload);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const listingResult = await client.query(`
      SELECT pl.id, cc.provider
      FROM product_listings pl
      JOIN commerce_channels cc ON cc.id = pl.channel_id AND cc.user_id = pl.user_id
      WHERE pl.id = $1 AND pl.user_id = $2
      LIMIT 1 FOR UPDATE OF pl
    `, [input.listingId, input.userId]);
    if (!listingResult.rows[0]) { await client.query("ROLLBACK"); return { error: "LISTING_NOT_FOUND" as const }; }
    if (listingResult.rows[0].provider !== input.provider) {
      await client.query("ROLLBACK");
      return { error: "INVALID_PROVIDER" as const };
    }

    const reservationResult = await client.query(`
      INSERT INTO commerce_publish_operations
        (user_id, listing_id, provider, operation, idempotency_key, request_fingerprint)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, provider, idempotency_key) DO NOTHING
      RETURNING id, listing_id, provider, operation, idempotency_key,
                request_fingerprint, status, external_id, attempt_count,
                last_error, last_attempt_at, completed_at, created_at, updated_at
    `, [input.userId, input.listingId, input.provider, input.operation, idempotencyKey, requestFingerprint]);

    if (reservationResult.rows[0]) {
      await client.query("COMMIT");
      return { operation: reservationResult.rows[0] };
    }

    const existingResult = await client.query(`
      SELECT id, listing_id, provider, operation, idempotency_key,
             request_fingerprint, status, external_id, attempt_count,
             last_error, last_attempt_at, completed_at, created_at, updated_at
      FROM commerce_publish_operations
      WHERE user_id = $1 AND provider = $2 AND idempotency_key = $3
      LIMIT 1 FOR UPDATE
    `, [input.userId, input.provider, idempotencyKey]);

    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return { error: "PUBLISH_OPERATION_RESERVATION_FAILED" as const };
    }
    if (String(existing.listing_id) !== String(input.listingId)) {
      await client.query("ROLLBACK");
      return { error: "IDEMPOTENCY_KEY_CONFLICT" as const };
    }
    if (existing.operation !== input.operation) {
      await client.query("ROLLBACK");
      return { error: "IDEMPOTENCY_OPERATION_CONFLICT" as const };
    }
    if (existing.request_fingerprint !== requestFingerprint) {
      await client.query("ROLLBACK");
      return { error: "IDEMPOTENCY_PAYLOAD_CONFLICT" as const };
    }

    await client.query("COMMIT");
    return { operation: existing };

  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function markCommercePublishOperationStarted(userId: number, operationId: string) {
  const result = await pool.query(`
    UPDATE commerce_publish_operations
    SET status = 'in_progress', attempt_count = attempt_count + 1, last_attempt_at = now(), updated_at = now()
    WHERE id = $1 AND user_id = $2 AND status IN ('prepared', 'failed')
    RETURNING *
  `, [operationId, userId]);
  return result.rows[0] ?? null;
}

export async function markCommercePublishOperationSucceeded(
  userId: number,
  operationId: string,
  externalId: string | null | undefined,
  listingId: string,
  provider: string,
) {
  const normalizedExternalId = externalId?.trim();
  if (!normalizedExternalId) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const operationResult = await client.query(`
      SELECT *
      FROM commerce_publish_operations
      WHERE id = $1
        AND user_id = $2
        AND listing_id = $3
        AND provider = $4
      LIMIT 1
      FOR UPDATE
    `, [operationId, userId, listingId, provider]);

    const operation = operationResult.rows[0];
    if (!operation || !["prepared", "in_progress", "unknown"].includes(operation.status)) {
      await client.query("ROLLBACK");
      return null;
    }

    const listingResult = await client.query(`
      SELECT id, channel_id, external_id
      FROM product_listings
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
      FOR UPDATE
    `, [listingId, userId]);

    const listing = listingResult.rows[0];
    if (!listing) {
      await client.query("ROLLBACK");
      return null;
    }

    if (listing.external_id && listing.external_id !== normalizedExternalId) {
      await client.query("ROLLBACK");
      throw new Error("LISTING_EXTERNAL_ID_MISMATCH");
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`,
      [`commerce-external-id:${userId}:${listing.channel_id}:${normalizedExternalId}`],
    );

    const externalIdConflict = await client.query(
      `
      SELECT id
      FROM product_listings
      WHERE channel_id = $1
        AND user_id = $2
        AND external_id = $3
        AND id <> $4
      LIMIT 1
      FOR UPDATE
      `,
      [listing.channel_id, userId, normalizedExternalId, listingId],
    );

    if (externalIdConflict.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error("LISTING_EXTERNAL_ID_CONFLICT");
    }

    const updatedOperationResult = await client.query(`
      UPDATE commerce_publish_operations
      SET status = 'succeeded',
          external_id = $3,
          last_error = NULL,
          completed_at = now(),
          updated_at = now()
      WHERE id = $1
        AND user_id = $2
        AND status IN ('prepared', 'in_progress', 'unknown')
      RETURNING *
    `, [operationId, userId, normalizedExternalId]);

    if (!updatedOperationResult.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(`
      UPDATE product_listings
      SET status = 'active',
          sync_status = 'synced',
          external_id = $1,
          last_synced_at = now(),
          last_error = NULL,
          updated_at = now()
      WHERE id = $2
        AND user_id = $3
    `, [normalizedExternalId, listingId, userId]);

    await client.query("COMMIT");
    return updatedOperationResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markCommercePublishOperationFailed(userId: number, operationId: string, errorMessage: string) {
  const result = await pool.query(`
    UPDATE commerce_publish_operations
    SET status = 'failed', last_error = $3, updated_at = now()
    WHERE id = $1 AND user_id = $2 AND status IN ('prepared', 'in_progress')
    RETURNING *
  `, [operationId, userId, errorMessage.slice(0, 2000)]);
  return result.rows[0] ?? null;
}

export async function markCommercePublishOperationUnknown(userId: number, operationId: string, errorMessage: string) {
  const result = await pool.query(`
    UPDATE commerce_publish_operations
    SET status = 'unknown', last_error = $3, updated_at = now()
    WHERE id = $1 AND user_id = $2 AND status = 'in_progress'
    RETURNING *
  `, [operationId, userId, errorMessage.slice(0, 2000)]);
  return result.rows[0] ?? null;
}
