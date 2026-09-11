CREATE TABLE marketing_content_items (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id bigint NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  content_type varchar(30) NOT NULL DEFAULT 'social_post',
  format varchar(30),
  topic text,
  angle text,
  hook text,
  body text,
  cta text,
  channel_strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_id integer REFERENCES media_library(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'planned',
  planned_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_content_items_status_check CHECK (status IN ('draft','planned','ready','converted','archived'))
);

CREATE INDEX idx_marketing_content_items_user_status
  ON marketing_content_items(user_id, status);
CREATE INDEX idx_marketing_content_items_campaign
  ON marketing_content_items(campaign_id);
CREATE INDEX idx_marketing_content_items_planned_for
  ON marketing_content_items(user_id, planned_for);

CREATE TABLE marketing_content_item_products (
  content_item_id bigint NOT NULL REFERENCES marketing_content_items(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_item_id, product_id)
);

CREATE INDEX idx_marketing_content_item_products_product
  ON marketing_content_item_products(product_id);

CREATE TABLE marketing_content_item_posts (
  content_item_id bigint NOT NULL REFERENCES marketing_content_items(id) ON DELETE CASCADE,
  post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_item_id, post_id)
);

CREATE INDEX idx_marketing_content_item_posts_post
  ON marketing_content_item_posts(post_id);
