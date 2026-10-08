# Dizito Legacy Social OAuth Token Encryption Migration Plan

**Date:** 2026-10-08  
**Branch:** `v1/security-audit`  
**Status:** Design/inventory only — no schema migration applied

## Purpose

Define a safe path to move legacy Meta, Instagram, LinkedIn, Pinterest, and Google Business OAuth credentials from plaintext columns to application-encrypted storage without breaking reconnect, publishing, account-health checks, or OAuth selection flows.

This document is intentionally a migration plan, not an executed migration. No destructive database change is authorized by this workstream.

## Confirmed plaintext storage

### `social_accounts`

Current credential-bearing columns:

- `access_token`
- `page_access_token`
- `refresh_token`
- `token_expires_at`

The current schema also contains provider identity fields used to locate the external account.

### `oauth_page_selections`

Current credential-bearing columns:

- `access_token`
- `refresh_token`
- `token_expires_at`

Additionally, the `pages` JSON payload can contain provider access-token material for the Meta Page-selection flow because discovered Page objects include `access_token`.

## Confirmed read/write inventory

### Meta / Instagram

**Writes**
- `app/api/meta/callback/route.ts`
  - writes the user OAuth access token to `oauth_page_selections.access_token`.
  - stores discovered Meta Page data in `oauth_page_selections.pages`; the normalized Page objects include Page access-token material.
- `app/api/meta/connect-pages/route.ts`
  - reads the temporary OAuth row.
  - writes `social_accounts.access_token` and `social_accounts.page_access_token` for Facebook and Instagram accounts.
  - deletes the temporary OAuth row after successful connection.
  - reconnect paths update both token fields.

**Reads / runtime consumers**
- `lib/publishers/facebook.ts` consumes `page_access_token`.
- `lib/publishers/instagram.ts` consumes `access_token`.
- `lib/accountHealth/checkAccounts.ts` consumes `access_token` for Instagram and `page_access_token` for Facebook.
- `lib/meta/api.ts` consumes access tokens when calling Meta.
- `lib/scheduler/processTarget.ts` loads the complete `social_accounts` row and passes it to publishers.

### LinkedIn

**Writes**
- `app/api/linkedin/callback/route.ts`
  - writes `social_accounts.access_token` on initial connection.
  - updates `access_token` on reconnect.

**Reads**
- `lib/publishers/linkedin.ts` consumes `account.access_token`.
- `lib/accountHealth/checkAccounts.ts` consumes `account.access_token`.
- `lib/scheduler/processTarget.ts` supplies the account row to the publisher.

### Pinterest

**Writes**
- `app/api/pinterest/callback/route.ts`
  - writes temporary `oauth_page_selections.access_token`, `refresh_token`, and `token_expires_at`.
  - updates `social_accounts.access_token`, `refresh_token`, and `token_expires_at` during reconnect.

**Reads**
- `lib/publishers/pinterest.ts` consumes `account.access_token`.
- `lib/accountHealth/checkAccounts.ts` consumes and refreshes `access_token` using `refresh_token`.
- `lib/platforms/pinterest/refreshToken.ts` is the refresh boundary.
- `app/api/pinterest/boards/route.ts` reads only the temporary `pages` payload for board selection and does not return token columns.

### Google Business

**Writes**
- `app/api/google-business/callback/route.ts`
  - writes temporary `oauth_page_selections.access_token` and `refresh_token`.
  - updates `social_accounts.access_token` and `refresh_token` on reconnect.

**Reads**
- `lib/publishers/google-business.ts` consumes `account.access_token`.
- `lib/accountHealth/checkAccounts.ts` consumes `account.access_token`.
- `app/api/google-business/locations/route.ts` reads only the temporary `pages` payload and does not return token columns.

## Important architectural seam

The two runtime paths that currently assume raw token columns are:

1. **Scheduler/publisher path**
   - `lib/scheduler/processTarget.ts` performs `SELECT * FROM social_accounts`.
   - Provider publishers consume token fields directly.

2. **Account-health path**
   - `lib/accountHealth/checkAccounts.ts` performs `SELECT * FROM social_accounts`.
   - Provider-specific checks and Pinterest refresh consume token fields directly.

The migration should therefore introduce an application credential boundary before changing the schema. The scheduler and account-health code should consume a typed decrypted credential object rather than know whether storage is plaintext or encrypted.

## Safe migration sequence

### Phase 1 — application seam

Create a dedicated server-only social credential repository/service with:

- explicit tenant/account ownership checks;
- provider-specific credential typing;
- encryption/decryption using an application secret;
- key-version metadata;
- no credential logging;
- explicit handling of missing/invalid ciphertext.

Refactor scheduler, publishers, account health, and OAuth callbacks to use this boundary.

### Phase 2 — additive schema

Add nullable encrypted columns; do not rename/drop the legacy columns yet.

Recommended shape:

- encrypted access token
- encrypted page access token
- encrypted refresh token
- encryption key/version metadata

For temporary OAuth state, add equivalent encrypted token fields to `oauth_page_selections`.

No existing plaintext rows should be deleted during this phase.

### Phase 3 — dual-write

For newly issued or refreshed credentials:

- write encrypted fields as the canonical new representation;
- continue writing legacy fields temporarily only where required for compatibility;
- never expose either representation to clients.

For temporary OAuth rows, dual-write until all consumers use the new fields.

### Phase 4 — dual-read with migration-on-read

Read encrypted credentials first.

If encrypted credentials are absent and a legacy value exists:

1. read the legacy value;
2. decrypt is not attempted on plaintext legacy data;
3. validate the credential at the application boundary;
4. encrypt and persist the value;
5. use the in-memory credential for the current request.

This creates gradual migration without requiring a plaintext-to-ciphertext database operation.

### Phase 5 — backfill / provider reconnection

Only after all consumers are encrypted-first:

- perform a controlled tenant-scoped backfill where safe;
- monitor migration coverage and failures;
- require reconnect for credentials that cannot be migrated safely;
- preserve provider identity fields independently from credential fields.

### Phase 6 — legacy removal

Only after:

- all reads are encrypted-first;
- all writes are encrypted;
- migration coverage is verified;
- refresh/reconnect flows are verified;
- scheduler and account-health paths are verified;
- rollback procedure exists.

Then remove legacy plaintext columns in a separate migration.

## Why a schema-only migration is unsafe

A SQL migration cannot safely encrypt existing application credentials without an application-held encryption key and a complete understanding of every consumer.

Changing or copying the columns without the application read/write seam could:

- strand existing connected accounts;
- break Pinterest refresh;
- break scheduled publishing;
- break account health checks;
- break reconnect flows;
- leave temporary OAuth selections unusable.

Therefore this workstream deliberately does **not** introduce an encryption migration yet.

## Tenant-isolation requirements

Every credential repository operation must bind credentials to:

`authenticated user → social account → tenant-owned resource`

No repository API should accept a raw account ID and return credentials without an ownership check.

Background scheduler reads require an equivalent trusted worker boundary because they do not have an interactive session.

## Verification requirements before legacy-column removal

At minimum:

- encrypted round-trip unit tests;
- wrong-key / malformed-ciphertext tests;
- tenant-crossing read regression test;
- OAuth connect/reconnect tests for Meta, LinkedIn, Pinterest, Google Business;
- Pinterest refresh-token test;
- Facebook/Instagram publisher credential injection test;
- LinkedIn publisher credential injection test;
- Google Business publisher credential injection test;
- scheduler publish test with encrypted credentials;
- account-health test with encrypted credentials;
- temporary OAuth selection flow test;
- rollback/recovery test.

## Current conclusion

**Finding:** P1 — plaintext legacy social OAuth credential storage.

**Status:** deferred / migration-sensitive.

**Implemented in this checkpoint:** complete source-level consumer inventory and migration design boundary.

**Not implemented:** database encryption columns, dual-write, backfill, plaintext-column removal.

**Runtime verified:** no.

**Externally verified:** no.

