-- Serverless-safe API rate limiting foundation.
-- Additive only; no existing application data is changed.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_updated_at_idx
  ON api_rate_limits (updated_at);
