-- Marketing experiment lifecycle
CREATE TABLE IF NOT EXISTS marketing_experiments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id BIGINT REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  content_item_id BIGINT REFERENCES marketing_content_items(id) ON DELETE SET NULL,
  variant_id BIGINT REFERENCES marketing_content_item_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  change_description TEXT NOT NULL,
  metric TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft','planned','running','completed','cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_experiments_user_status
  ON marketing_experiments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_experiments_campaign
  ON marketing_experiments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_experiments_content
  ON marketing_experiments(content_item_id);
CREATE INDEX IF NOT EXISTS idx_marketing_experiments_variant
  ON marketing_experiments(variant_id);
