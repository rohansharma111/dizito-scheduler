-- Scope publish idempotency keys to a commerce channel.
-- A key may be reused on different channels, but not for multiple listings
-- within the same channel.

DROP INDEX IF EXISTS unique_product_listing_publish_idempotency;

CREATE UNIQUE INDEX IF NOT EXISTS unique_channel_publish_idempotency
  ON product_listings (channel_id, publish_idempotency_key)
  WHERE publish_idempotency_key IS NOT NULL;
