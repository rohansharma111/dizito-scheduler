CREATE TABLE marketing_content_item_variants (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_item_id bigint NOT NULL REFERENCES marketing_content_items(id) ON DELETE CASCADE,
  platform varchar(40) NOT NULL,
  hook text,
  body text,
  cta text,
  media_id integer REFERENCES media_library(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_content_item_variants_status_check CHECK (status IN ('draft','ready','converted','archived')),
  CONSTRAINT marketing_content_item_variants_platform_check CHECK (platform IN ('facebook','instagram','linkedin','pinterest','google_business')),
  UNIQUE (content_item_id, platform)
);

CREATE INDEX idx_marketing_content_item_variants_user_platform
  ON marketing_content_item_variants(user_id, platform);
CREATE INDEX idx_marketing_content_item_variants_content_item
  ON marketing_content_item_variants(content_item_id);

CREATE INDEX idx_marketing_content_item_variants_media
  ON marketing_content_item_variants(media_id);
