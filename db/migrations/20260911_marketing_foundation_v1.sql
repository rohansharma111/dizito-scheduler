-- Marketing Foundation v1
-- Business context, marketing goals, and reusable offers.
-- Intentionally separate from users/account settings and Commerce Products.

CREATE TABLE IF NOT EXISTS marketing_business_profiles (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type varchar(100),
  industry varchar(150),
  description text,
  website_url text,
  location text,
  timezone varchar(100),
  brand_voice text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS marketing_goals (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal_type varchar(50) NOT NULL,
  description text,
  priority integer DEFAULT 1 NOT NULL,
  status varchar(20) DEFAULT 'active' NOT NULL,
  target_value numeric,
  target_period varchar(30),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT marketing_goals_priority_check CHECK (priority > 0),
  CONSTRAINT marketing_goals_status_check CHECK (status IN ('active','paused','completed','archived'))
);

CREATE INDEX IF NOT EXISTS marketing_goals_user_status_idx
  ON marketing_goals(user_id, status);

CREATE TABLE IF NOT EXISTS marketing_offers (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  offer_type varchar(50) NOT NULL,
  description text,
  terms text,
  code varchar(100),
  starts_at timestamptz,
  ends_at timestamptz,
  status varchar(20) DEFAULT 'draft' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT marketing_offers_status_check CHECK (status IN ('draft','active','paused','expired','archived'))
);

CREATE INDEX IF NOT EXISTS marketing_offers_user_status_idx
  ON marketing_offers(user_id, status);

CREATE INDEX IF NOT EXISTS marketing_offers_user_dates_idx
  ON marketing_offers(user_id, starts_at, ends_at);
