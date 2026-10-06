-- Structured marketing experiment target metadata
ALTER TABLE marketing_experiments
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_field TEXT,
  ADD COLUMN IF NOT EXISTS target_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE marketing_experiments
  DROP CONSTRAINT IF EXISTS marketing_experiments_target_type_check;

ALTER TABLE marketing_experiments
  ADD CONSTRAINT marketing_experiments_target_type_check
  CHECK (target_type IS NULL OR target_type IN ('campaign','content_item','variant'));

CREATE INDEX IF NOT EXISTS idx_marketing_experiments_target_type
  ON marketing_experiments(user_id, target_type);
