CREATE TABLE marketing_asset_metadata (
  media_id integer PRIMARY KEY REFERENCES media_library(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type varchar(30) NOT NULL DEFAULT 'general',
  description text,
  ai_context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_asset_metadata_type_check CHECK (asset_type IN ('general','product','service','team','customer','testimonial','logo','offer','lifestyle','before_after','video'))
);

CREATE INDEX idx_marketing_asset_metadata_user_type
  ON marketing_asset_metadata(user_id, asset_type);

CREATE TABLE marketing_asset_products (
  media_id integer NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, product_id)
);

CREATE INDEX idx_marketing_asset_products_product
  ON marketing_asset_products(product_id);
