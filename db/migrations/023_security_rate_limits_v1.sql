-- Dizito security rate limiting v1.
-- Durable, tenant-aware counters for serverless-safe API protection.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated_at
  ON rate_limit_buckets (updated_at);
