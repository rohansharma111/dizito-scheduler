-- Additive-only migration for the legacy social credential encryption rollout.
-- This migration intentionally does not copy, transform, or delete existing values.
-- Application code must dual-write before legacy values can be retired.

ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS page_access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS credential_encryption_version text;

ALTER TABLE oauth_page_selections
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS pages_encrypted text,
  ADD COLUMN IF NOT EXISTS credential_encryption_version text;
