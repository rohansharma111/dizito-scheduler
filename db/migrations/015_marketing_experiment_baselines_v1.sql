-- Store the baseline comparison window used for completed experiment evidence.
-- Baselines are descriptive historical comparisons, not causal controls.
ALTER TABLE marketing_experiments
  ADD COLUMN IF NOT EXISTS baseline_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS baseline_ends_at TIMESTAMPTZ;

ALTER TABLE marketing_experiments
  DROP CONSTRAINT IF EXISTS marketing_experiments_baseline_window_check;

ALTER TABLE marketing_experiments
  ADD CONSTRAINT marketing_experiments_baseline_window_check
  CHECK (
    baseline_starts_at IS NULL
    OR baseline_ends_at IS NULL
    OR baseline_starts_at <= baseline_ends_at
  );

CREATE INDEX IF NOT EXISTS idx_marketing_experiments_baseline_window
  ON marketing_experiments(user_id, baseline_starts_at, baseline_ends_at);
