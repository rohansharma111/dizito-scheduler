-- Canonical product classification used by channels such as Amazon India.
-- HSN is business/product data, not an Amazon-specific draft field.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hsn_code varchar(16);

CREATE INDEX IF NOT EXISTS idx_products_hsn_code
  ON products(hsn_code)
  WHERE hsn_code IS NOT NULL;
