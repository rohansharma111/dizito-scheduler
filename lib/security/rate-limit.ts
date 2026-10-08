import { createHmac } from "node:crypto";

import { pool } from "@/lib/db";

export interface RateLimitOptions {
  scope: string;
  limit: number;
  windowSeconds?: number;
  userId?: string | number | null;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

function hashAnonymousIdentity(identity: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("RATE_LIMIT_HASH_SECRET or NEXTAUTH_SECRET is required");
  }

  return createHmac("sha256", secret).update(identity).digest("hex");
}

export function getRequestIdentity(
  request: Request,
  userId?: string | number | null,
): string {
  if (userId !== null && userId !== undefined && String(userId).trim()) {
    return `user:${String(userId).trim()}`;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";

  return `ip:${hashAnonymousIdentity(ip)}`;
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("Rate limit must be a positive integer");
  }

  const windowSeconds = options.windowSeconds ?? 60;

  if (!Number.isInteger(windowSeconds) || windowSeconds <= 0) {
    throw new Error("Rate limit window must be a positive integer");
  }

  const identity = getRequestIdentity(request, options.userId);
  const bucketNumber = Math.floor(Date.now() / 1000 / windowSeconds);
  const windowStart = new Date(bucketNumber * windowSeconds * 1000);
  const bucketKey = `${options.scope}:${identity}`;

  const result = await pool.query(
    `
      INSERT INTO rate_limit_buckets (
        bucket_key,
        window_start,
        request_count
      )
      VALUES ($1, $2, 1)
      ON CONFLICT (bucket_key)
      DO UPDATE SET
        request_count = CASE
          WHEN rate_limit_buckets.window_start = EXCLUDED.window_start
            THEN rate_limit_buckets.request_count + 1
          ELSE 1
        END,
        window_start = EXCLUDED.window_start,
        updated_at = now()
      RETURNING request_count, window_start
    `,
    [bucketKey, windowStart],
  );

  const count = Number(result.rows[0]?.request_count ?? 1);
  const storedWindowStart = new Date(result.rows[0]?.window_start ?? windowStart);
  const windowEndMs = storedWindowStart.getTime() + windowSeconds * 1000;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEndMs - Date.now()) / 1000),
  );

  return {
    allowed: count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterSeconds,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) {
    return null;
  }

  return Response.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
