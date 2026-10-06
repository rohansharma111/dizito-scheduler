-- Enforce tenant/product consistency for Commerce listing mappings.
-- Existing legacy rows are intentionally left VALIDATION-pending so deployment
-- does not rewrite or reject historical data during this hardening pass.

ALTER TABLE product_listing_variants
  ADD CONSTRAINT fk_listing_variants_listing
  FOREIGN KEY (listing_id)
  REFERENCES product_listings(id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE product_listing_variants
  ADD CONSTRAINT fk_listing_variants_product_variant_consistency
  FOREIGN KEY (variant_id)
  REFERENCES product_variants(id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE product_listing_media
  ADD CONSTRAINT fk_listing_media_listing
  FOREIGN KEY (listing_id)
  REFERENCES product_listings(id)
  ON DELETE CASCADE
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_product_listing_variants_listing_variant
  ON product_listing_variants(listing_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_product_listing_media_listing_media
  ON product_listing_media(listing_id, product_media_id);
