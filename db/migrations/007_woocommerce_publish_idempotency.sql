-- Persist a caller-supplied idempotency key for provider publish attempts.
-- A key is scoped to a listing so retries cannot create a second external product.

ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS publish_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS unique_product_listing_publish_idempotency
  ON product_listings (id, publish_idempotency_key)
  WHERE publish_idempotency_key IS NOT NULL;
