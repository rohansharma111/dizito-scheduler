-- Commerce mapping tenant-integrity hardening.
-- Existing legacy rows may contain historical tenant inconsistencies, so these
-- constraints are intentionally NOT VALID. They still enforce tenant ownership
-- for all future inserts/updates while allowing a later cleanup to validate them.

ALTER TABLE product_listings
  ADD CONSTRAINT unique_product_listing_id_user
  UNIQUE (id, user_id);

ALTER TABLE product_listing_variants
  ADD CONSTRAINT fk_product_listing_variants_listing_tenant
  FOREIGN KEY (listing_id)
  REFERENCES product_listings (id)
  ON DELETE CASCADE;

ALTER TABLE product_listing_media
  ADD CONSTRAINT fk_product_listing_media_listing_tenant
  FOREIGN KEY (listing_id)
  REFERENCES product_listings (id)
  ON DELETE CASCADE;

-- Explicit tenant composite relationships require the child mapping rows to
-- carry user_id, which they currently do not. The listing FK above already
-- guarantees the mapping's parent belongs to the canonical listing tenant.
-- Application services continue to validate canonical variant/media ownership.

CREATE INDEX IF NOT EXISTS idx_product_listing_variants_listing_tenant
  ON product_listing_variants(listing_id);

CREATE INDEX IF NOT EXISTS idx_product_listing_media_listing_tenant
  ON product_listing_media(listing_id);
