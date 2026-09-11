CREATE TABLE marketing_customer_actions (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type varchar(30) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'completed',
  campaign_id bigint REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  content_item_id bigint REFERENCES marketing_content_items(id) ON DELETE SET NULL,
  variant_id bigint REFERENCES marketing_content_item_variants(id) ON DELETE SET NULL,
  customer_id bigint REFERENCES customers(id) ON DELETE SET NULL,
  order_id bigint,
  value integer,
  currency varchar(3),
  source varchar(50),
  external_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_customer_actions_type_check CHECK (action_type IN ('lead','booking','message','call','website_visit','checkout','order','purchase')),
  CONSTRAINT marketing_customer_actions_status_check CHECK (status IN ('pending','completed','cancelled')),
  CONSTRAINT marketing_customer_actions_value_check CHECK (value IS NULL OR value >= 0),
  CONSTRAINT marketing_customer_actions_currency_check CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  CONSTRAINT marketing_customer_actions_external_key UNIQUE (user_id, source, external_id)
);

CREATE INDEX idx_marketing_customer_actions_user_occurred
  ON marketing_customer_actions(user_id, occurred_at DESC);
CREATE INDEX idx_marketing_customer_actions_campaign
  ON marketing_customer_actions(campaign_id, occurred_at DESC);
CREATE INDEX idx_marketing_customer_actions_content
  ON marketing_customer_actions(content_item_id, occurred_at DESC);
CREATE INDEX idx_marketing_customer_actions_variant
  ON marketing_customer_actions(variant_id, occurred_at DESC);
CREATE INDEX idx_marketing_customer_actions_customer
  ON marketing_customer_actions(customer_id);
CREATE INDEX idx_marketing_customer_actions_order
  ON marketing_customer_actions(order_id);
