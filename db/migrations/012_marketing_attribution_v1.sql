-- Marketing Attribution v1
-- Explicit, auditable attribution records. No causal inference is performed.

CREATE TABLE marketing_attributions (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_action_id bigint NOT NULL REFERENCES marketing_customer_actions(id) ON DELETE CASCADE,
  campaign_id bigint REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  content_item_id bigint REFERENCES marketing_content_items(id) ON DELETE SET NULL,
  variant_id bigint REFERENCES marketing_content_item_variants(id) ON DELETE SET NULL,
  post_id integer REFERENCES posts(id) ON DELETE SET NULL,
  order_id bigint REFERENCES orders(id) ON DELETE SET NULL,
  attribution_model varchar(30) NOT NULL DEFAULT 'manual',
  attributed_value integer,
  currency varchar(3),
  weight numeric(8,6),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_attributions_model_check CHECK (attribution_model IN ('manual')),
  CONSTRAINT marketing_attributions_value_check CHECK (attributed_value IS NULL OR attributed_value >= 0),
  CONSTRAINT marketing_attributions_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  CONSTRAINT marketing_attributions_weight_check CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)),
  CONSTRAINT marketing_attributions_touch_check CHECK (
    campaign_id IS NOT NULL OR content_item_id IS NOT NULL OR variant_id IS NOT NULL OR post_id IS NOT NULL
  )
);

CREATE INDEX idx_marketing_attributions_user_created
  ON marketing_attributions(user_id, created_at DESC);
CREATE INDEX idx_marketing_attributions_action
  ON marketing_attributions(customer_action_id);
CREATE INDEX idx_marketing_attributions_campaign
  ON marketing_attributions(campaign_id);
CREATE INDEX idx_marketing_attributions_content
  ON marketing_attributions(content_item_id);
CREATE INDEX idx_marketing_attributions_variant
  ON marketing_attributions(variant_id);
CREATE INDEX idx_marketing_attributions_post
  ON marketing_attributions(post_id);
CREATE INDEX idx_marketing_attributions_order
  ON marketing_attributions(order_id);
