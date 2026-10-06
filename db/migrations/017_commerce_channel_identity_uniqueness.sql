-- Prevent duplicate Commerce channel identities within a tenant.
-- NULL external_account_id values remain allowed to coexist; OAuth-backed
-- channels use a concrete provider/account identity.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commerce_channels_user_provider_external_account
  ON commerce_channels (user_id, provider, external_account_id)
  WHERE external_account_id IS NOT NULL;
