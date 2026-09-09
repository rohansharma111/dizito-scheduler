-- Amazon SP-API seller credentials are kept separate from commerce_channels.metadata.
-- Refresh tokens are encrypted application-side before persistence.

CREATE TABLE IF NOT EXISTS amazon_channel_credentials (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL UNIQUE REFERENCES commerce_channels(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amazon_channel_credentials_channel
  ON amazon_channel_credentials(channel_id);
