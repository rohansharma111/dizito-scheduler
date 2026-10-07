-- V1 billing model: Billing Plan -> Entitlements -> Subscription -> Provider Mapping -> Usage.
-- Pricing and limits are product hypotheses and intentionally remain easy to change.

CREATE TABLE IF NOT EXISTS billing_plans (
  id bigserial PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  description text,
  price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'INR',
  billing_interval varchar(20) NOT NULL DEFAULT 'month',
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_entitlement_definitions (
  id bigserial PRIMARY KEY,
  key varchar(100) NOT NULL UNIQUE,
  description text NOT NULL,
  value_type varchar(20) NOT NULL CHECK (value_type IN ('boolean','integer','json')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_plan_entitlement_values (
  plan_id bigint NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  entitlement_id bigint NOT NULL REFERENCES billing_entitlement_definitions(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  PRIMARY KEY (plan_id, entitlement_id)
);

CREATE TABLE IF NOT EXISTS billing_provider_mappings (
  id bigserial PRIMARY KEY,
  plan_id bigint NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL,
  provider_plan_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, provider),
  UNIQUE (provider, provider_plan_id)
);

CREATE TABLE IF NOT EXISTS billing_usage_counters (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  entitlement_key varchar(100) NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start, entitlement_key)
);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id bigserial PRIMARY KEY,
  provider varchar(50) NOT NULL,
  provider_event_id text NOT NULL,
  event_type varchar(100) NOT NULL,
  provider_subscription_id text,
  payload jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processed','failed')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_plan_id bigint REFERENCES billing_plans(id),
  ADD COLUMN IF NOT EXISTS pending_billing_plan_id bigint REFERENCES billing_plans(id),
  ADD COLUMN IF NOT EXISTS plan_change_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_billing_plan_entitlement_values_plan
  ON billing_plan_entitlement_values(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_provider_mappings_plan
  ON billing_provider_mappings(plan_id);
CREATE INDEX IF NOT EXISTS idx_billing_usage_user_period
  ON billing_usage_counters(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_subscription
  ON billing_webhook_events(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_plan
  ON subscriptions(billing_plan_id);

INSERT INTO billing_plans
  (code, name, description, price_minor, currency, billing_interval, trial_days, is_active, is_public, sort_order, metadata)
VALUES
  ('free', 'Free', 'Free V1 entry plan', 0, 'INR', 'month', 0, true, true, 10, '{"pricing_hypothesis":true}'),
  ('growth', 'Growth', 'For growing businesses', 79900, 'INR', 'month', 7, true, true, 20, '{"pricing_hypothesis":true}'),
  ('pro', 'Pro', 'For businesses running a serious growth engine', 199900, 'INR', 'month', 7, true, true, 30, '{"pricing_hypothesis":true}'),
  ('agency', 'Agency', 'Future multi-business / agency plan', 499900, 'INR', 'month', 14, false, false, 40, '{"pricing_hypothesis":true,"future":true}'),
  ('founding_beta', 'Founding Beta', 'Private beta offer', 49900, 'INR', 'month', 7, true, false, 5, '{"pricing_hypothesis":true,"private_beta":true}')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_minor = EXCLUDED.price_minor,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  trial_days = EXCLUDED.trial_days,
  is_active = EXCLUDED.is_active,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO billing_entitlement_definitions (key, description, value_type)
VALUES
  ('channels.social.max', 'Maximum connected social channels', 'integer'),
  ('channels.commerce.max', 'Maximum connected commerce channels', 'integer'),
  ('publishing.monthly.max', 'Maximum publishing actions per billing month', 'integer'),
  ('ai.actions.monthly.max', 'Maximum AI generation actions per billing month', 'integer'),
  ('feature.business_brain', 'Access to Business Brain', 'boolean'),
  ('feature.strategist', 'Access to AI Strategist', 'boolean'),
  ('feature.creator', 'Access to AI Creator', 'boolean'),
  ('feature.generate_my_week', 'Access to Generate My Week', 'boolean'),
  ('feature.optimizer', 'Access to Optimizer', 'boolean'),
  ('feature.commerce', 'Access to commerce workflows', 'boolean')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type;

WITH plan_values(code, social_max, commerce_max, publishing_max, ai_max, brain, strategist, creator, week, optimizer, commerce) AS (
  VALUES
    ('free', 3, 0, 50, 25, true, false, true, false, false, false),
    ('growth', 10, 2, 500, 250, true, true, true, true, false, true),
    ('pro', 25, 5, 2000, 1000, true, true, true, true, true, true),
    ('agency', 100, 25, 10000, 5000, true, true, true, true, true, true),
    ('founding_beta', 10, 2, 500, 250, true, true, true, true, false, true)
)
INSERT INTO billing_plan_entitlement_values (plan_id, entitlement_id, value)
SELECT bp.id, be.id, v.value
FROM plan_values p
JOIN billing_plans bp ON bp.code = p.code
CROSS JOIN LATERAL (VALUES
  ('channels.social.max', to_jsonb(p.social_max)),
  ('channels.commerce.max', to_jsonb(p.commerce_max)),
  ('publishing.monthly.max', to_jsonb(p.publishing_max)),
  ('ai.actions.monthly.max', to_jsonb(p.ai_max)),
  ('feature.business_brain', to_jsonb(p.brain)),
  ('feature.strategist', to_jsonb(p.strategist)),
  ('feature.creator', to_jsonb(p.creator)),
  ('feature.generate_my_week', to_jsonb(p.week)),
  ('feature.optimizer', to_jsonb(p.optimizer)),
  ('feature.commerce', to_jsonb(p.commerce))
) AS v(key, value)
JOIN billing_entitlement_definitions be ON be.key = v.key
ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;

-- Preserve existing historical subscriptions while moving them onto the new catalog.
UPDATE subscriptions s
SET billing_plan_id = bp.id
FROM billing_plans bp
WHERE s.billing_plan_id IS NULL
  AND bp.code = CASE
    WHEN s.plan = 'creator' THEN 'growth'
    WHEN s.plan = 'agency' THEN 'agency'
    WHEN s.plan = 'free' THEN 'free'
    ELSE s.plan
  END;

-- Existing users remain backward-compatible through users.plan; entitlement resolution
-- now prefers the canonical subscription.billing_plan_id and falls back to Free.
