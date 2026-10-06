-- Commerce tenant-integrity hardening.
-- Preserve the existing numeric IDs while making channel/listing ownership
-- relationships enforceable by PostgreSQL for all new writes.
--
-- Existing rows are not rewritten here. The composite foreign keys are
-- intentionally NOT VALID so deployments with legacy inconsistent rows can
-- continue; they still enforce the constraint for all future inserts/updates.
-- A later data-cleanup migration can validate them once legacy rows are clean.

ALTER TABLE commerce_channels
  ADD CONSTRAINT unique_commerce_channel_id_user
  UNIQUE (id, user_id);

ALTER TABLE product_listings
  ADD CONSTRAINT fk_product_listings_channel_tenant
  FOREIGN KEY (channel_id, user_id)
  REFERENCES commerce_channels (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE commerce_publish_operations
  ADD CONSTRAINT fk_publish_operations_listing_tenant
  FOREIGN KEY (listing_id, user_id)
  REFERENCES product_listings (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE commerce_publish_attempts
  ADD CONSTRAINT fk_publish_attempts_channel_tenant
  FOREIGN KEY (channel_id, user_id)
  REFERENCES commerce_channels (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE commerce_publish_attempts
  ADD CONSTRAINT fk_publish_attempts_listing_tenant
  FOREIGN KEY (listing_id, user_id)
  REFERENCES product_listings (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_product_listings_channel_user
  ON product_listings(channel_id, user_id);

CREATE INDEX IF NOT EXISTS idx_publish_operations_listing_user
  ON commerce_publish_operations(listing_id, user_id);

CREATE INDEX IF NOT EXISTS idx_publish_attempts_channel_user
  ON commerce_publish_attempts(channel_id, user_id);

CREATE INDEX IF NOT EXISTS idx_publish_attempts_listing_user
  ON commerce_publish_attempts(listing_id, user_id);
