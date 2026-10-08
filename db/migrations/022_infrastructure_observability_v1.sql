-- Dizito infrastructure observability v1.
-- Safe, additive, evidence-backed observability/index changes.
-- Production enablement was already executed before reconciliation; this file
-- is the canonical migration-runner representation on current main.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE INDEX IF NOT EXISTS idx_system_events_user_created_at
  ON system_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_created_at
  ON billing_events (user_id, created_at DESC);
