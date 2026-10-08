import crypto from "node:crypto";

import { pool } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
};

function getRateLimitHashKey(): string {
  const key = process.env.RATE_LIMIT_HASH_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!key) throw new Error("RATE_LIMIT_HASH_KEY or NEXTAUTH_SECRET is required");
  return key;
}

function hashRateLimitKey(bucket: string, identifier: string): string {
  return crypto.createHmac("sha256", getRateLimitHashKey()).update(bucket).update("|").update(identifier).digest("hex");
}

export async function consumeRateLimit(input: {
  bucket: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  if (!Number.isInteger(input.limit) || input.limit <= 0) throw new Error("Rate-limit limit must be a positive integer");
  if (!Number.isInteger(input.windowSeconds) || input.windowSeconds <= 0) throw new Error("Rate-limit window must be a positive integer");
  if (!input.bucket || !input.identifier) throw new Error("Rate-limit bucket and identifier are required");

  const keyHash = hashRateLimitKey(input.bucket, input.identifier);
  const result = await pool.query<{ request_count: number; window_started_at: Date }>(
    `
      WITH current_window AS (
        SELECT to_timestamp(floor(extract(epoch FROM NOW()) / $2) * $2) AS window_started_at
      )
      INSERT INTO api_rate_limits (key_hash, window_started_at, request_count, updated_at)
      SELECT $1, window_started_at, 1, NOW() FROM current_window
      ON CONFLICT (key_hash) DO UPDATE
      SET
        window_started_at = CASE WHEN api_rate_limits.window_started_at < EXCLUDED.window_started_at THEN EXCLUDED.window_started_at ELSE api_rate_limits.window_started_at END,
        request_count = CASE WHEN api_rate_limits.window_started_at < EXCLUDED.window_started_at THEN 1 ELSE api_rate_limits.request_count + 1 END,
        updated_at = NOW()
      RETURNING request_count, window_started_at
    `,
    [keyHash, input.windowSeconds],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Rate-limit state was not returned");
  const resetAt = new Date(row.window_started_at.getTime() + input.windowSeconds * 1000);
  return { allowed: row.request_count <= input.limit, count: row.request_count, limit: input.limit, resetAt };
}