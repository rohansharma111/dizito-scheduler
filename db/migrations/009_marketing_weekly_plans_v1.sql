CREATE TABLE marketing_weekly_plans (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  strategy_summary text,
  plan_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_weekly_plans_status_check CHECK (status IN ('draft','ready','approved','archived')),
  CONSTRAINT marketing_weekly_plans_date_check CHECK (week_end >= week_start),
  CONSTRAINT marketing_weekly_plans_user_week_unique UNIQUE (user_id, week_start)
);

CREATE INDEX idx_marketing_weekly_plans_user_status ON marketing_weekly_plans(user_id, status);
CREATE INDEX idx_marketing_weekly_plans_user_dates ON marketing_weekly_plans(user_id, week_start, week_end);

CREATE TABLE marketing_weekly_plan_campaigns (
  weekly_plan_id bigint NOT NULL REFERENCES marketing_weekly_plans(id) ON DELETE CASCADE,
  campaign_id bigint NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (weekly_plan_id, campaign_id),
  CONSTRAINT marketing_weekly_plan_campaigns_position_check CHECK (position >= 0)
);

CREATE INDEX idx_marketing_weekly_plan_campaigns_campaign ON marketing_weekly_plan_campaigns(campaign_id);
