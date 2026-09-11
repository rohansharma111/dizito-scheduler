-- Optional variant-level HSN override. Product HSN remains the default.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS hsn_code varchar(16);

CREATE INDEX IF NOT EXISTS idx_product_variants_hsn_code
  ON product_variants(hsn_code)
  WHERE hsn_code IS NOT NULL;
