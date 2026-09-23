-- Durable attempt ledger for WooCommerce publish/reconciliation work.
-- Provider responses may be ambiguous; retain request and outcome state.

CREATE TABLE IF NOT EXISTS commerce_publish_attempts (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id bigint NOT NULL REFERENCES commerce_channels(id) ON DELETE CASCADE,
  listing_id bigint NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  idempotency_key text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'succeeded', 'failed', 'ambiguous')),
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb,
  external_id text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_commerce_publish_attempt UNIQUE (channel_id, listing_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_commerce_publish_attempts_listing
  ON commerce_publish_attempts(listing_id);
CREATE INDEX IF NOT EXISTS idx_commerce_publish_attempts_status
  ON commerce_publish_attempts(status);
