-- Prevent stale Commerce sync workers from overwriting a newer sync claim.
-- The token is returned to the worker that acquired the lease and must be
-- presented when committing success/failure state.

ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS sync_claim_token text;

CREATE INDEX IF NOT EXISTS idx_product_listings_sync_claim_token
  ON product_listings(sync_claim_token)
  WHERE sync_claim_token IS NOT NULL;
