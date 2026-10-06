import crypto from "node:crypto";
import { pool } from "@/lib/db";

export type CommercePublishOperation =
  | "create"
  | "update"
  | "inventory"
  | "price";

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

function fingerprint(payload: unknown) {
  const canonical = JSON.stringify(payload);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export async function prepareCommercePublishOperation(
  input: PreparePublishOperationInput,
) {
  const requestFingerprint = fingerprint(input.requestPayload);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const listingResult = await client.query(
      `
      SELECT id, channel_id
      FROM product_listings
      WHERE id = $1 AND user_id = $2
      LIMIT 1
      FOR UPDATE
      `,
      [input.listingId, input.userId],
    );

    if (!listingResult.rows[0]) {
      await client.query("ROLLBACK");
      return { error: "LISTING_NOT_FOUND" as const };
    }

    const existingResult = await client.query(
      `
      SELECT id, listing_id, provider, operation, idempotency_key,
             request_fingerprint, status, external_id, attempt_count,
             last_error, last_attempt_at, completed_at,
             created_at, updated_at
      FROM commerce_publish_operations
      WHERE user_id = $1
        AND provider = $2
        AND idempotency_key = $3
      LIMIT 1
      FOR UPDATE
      `,
      [input.userId, input.provider, input.idempotencyKey],
    );

    if (existingResult.rows[0]) {
      const existing = existingResult.rows[0];

      if (existing.listing_id !== Number(input.listingId)) {
        await client.query("ROLLBACK");
        return { error: "IDEMPOTENCY_KEY_CONFLICT" as const };
      }

      if (existing.request_fingerprint !== requestFingerprint) {
        await client.query("ROLLBACK");
        return { error: "IDEMPOTENCY_PAYLOAD_CONFLICT" as const };
      }

      await client.query("COMMIT");
      return { operation: existing };
    }

    const result = await client.query(
      `
      INSERT INTO commerce_publish_operations
        (user_id, listing_id, provider, operation, idempotency_key, request_fingerprint)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, listing_id, provider, operation, idempotency_key,
        request_fingerprint, status, external_id, attempt_count,
        last_error, last_attempt_at, completed_at,
        created_at, updated_at
      `,
      [
        input.userId,
        input.listingId,
        input.provider,
        input.operation,
        input.idempotencyKey,
        requestFingerprint,
      ],
    );

    await client.query("COMMIT");
    return { operation: result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markCommercePublishOperationStarted(
  userId: number,
  operationId: string,
) {
  const result = await pool.query(
    `
    UPDATE commerce_publish_operations
    SET
      status = 'in_progress',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [operationId, userId],
  );

  return result.rows[0] ?? null;
}

export async function markCommercePublishOperationSucceeded(
  userId: number,
  operationId: string,
  externalId?: string | null,
) {
  const result = await pool.query(
    `
    UPDATE commerce_publish_operations
    SET
      status = 'succeeded',
      external_id = COALESCE($3, external_id),
      last_error = NULL,
      completed_at = now(),
      updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [operationId, userId, externalId ?? null],
  );

  return result.rows[0] ?? null;
}

export async function markCommercePublishOperationFailed(
  userId: number,
  operationId: string,
  errorMessage: string,
) {
  const result = await pool.query(
    `
    UPDATE commerce_publish_operations
    SET
      status = 'failed',
      last_error = $3,
      updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [operationId, userId, errorMessage.slice(0, 2000)],
  );

  return result.rows[0] ?? null;
}

export async function markCommercePublishOperationUnknown(
  userId: number,
  operationId: string,
  errorMessage: string,
) {
  const result = await pool.query(
    `
    UPDATE commerce_publish_operations
    SET
      status = 'unknown',
      last_error = $3,
      updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [operationId, userId, errorMessage.slice(0, 2000)],
  );

  return result.rows[0] ?? null;
}
