CREATE TABLE marketing_campaigns (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id bigint REFERENCES marketing_goals(id) ON DELETE SET NULL,
  offer_id bigint REFERENCES marketing_offers(id) ON DELETE SET NULL,
  name text NOT NULL,
  objective text,
  audience text,
  cta text,
  channel_strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaigns_status_check CHECK (status IN ('draft','planned','active','paused','completed','archived')),
  CONSTRAINT marketing_campaigns_date_range_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX idx_marketing_campaigns_user_status ON marketing_campaigns(user_id, status);
CREATE INDEX idx_marketing_campaigns_goal ON marketing_campaigns(goal_id);
CREATE INDEX idx_marketing_campaigns_offer ON marketing_campaigns(offer_id);
CREATE INDEX idx_marketing_campaigns_dates ON marketing_campaigns(user_id, starts_at, ends_at);

CREATE TABLE marketing_campaign_products (
  campaign_id bigint NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, product_id)
);

CREATE INDEX idx_marketing_campaign_products_product ON marketing_campaign_products(product_id);

CREATE TABLE marketing_campaign_posts (
  campaign_id bigint NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, post_id)
);

CREATE INDEX idx_marketing_campaign_posts_post ON marketing_campaign_posts(post_id);
