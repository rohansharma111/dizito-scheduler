# Dizito V1 Security Audit — 2026-10-08

## Scope
Source-level audit of authentication, authorization, tenant isolation, OAuth, provider credentials, token encryption, webhooks, replay protection, rate limiting, uploads, SSRF, AI isolation, logs, secret leakage, headers/cookies, and dependencies.

This audit was performed before security changes. No destructive database changes were made and no branch was merged.

## Findings

### P0 — blocker

1. **Next.js dependency security floor was below the current patched release.**
   - The branch now aligns package.json and package-lock.json on Next.js **16.3.8** and eslint-config-next **16.3.8**.
   - CI installation evidence: `npm ci` succeeds on Node 22.
   - Full repository CI remains non-green because of existing lint/test debt; this does not establish production runtime security.
   - Status: **implemented at dependency level; runtime/deployed-artifact verification pending**.

### P1 — important

2. **Unauthenticated cross-tenant auth-recovery endpoint.**
   - /api/post-targets/recover-auth previously accepted arbitrary socialAccountId and mutated failed targets without session/tenant authorization.
   - Fixed with session authorization, owner scoping through posts.user_id, and a protected server-to-server path using NEXTAUTH_SECRET for existing OAuth recovery calls.

3. **Predictable/session-unbound Meta and LinkedIn OAuth state.**
   - Meta used predictable reconnect state and LinkedIn used connect / reconnect:<id>:<type> state.
   - Fixed by generating high-entropy state and binding it to an HttpOnly SameSite cookie, then verifying it with constant-time comparison before token exchange.
   - Regression tests added for the reusable OAuth state verifier.

4. **OAuth initiation was reachable without an authenticated session for Pinterest and Google Business.**
   - Fixed by requiring a valid NextAuth session before initiating the OAuth flow.

5. **Razorpay webhook handler logged the raw payload and signature.**
   - Removed full webhook-body/signature/event-id logging.
   - Signature verification still occurs before JSON parsing.
   - Replay resistance is layered: provider event IDs are deduplicated, and provider payment IDs are independently idempotent at the payment-attempt layer.

6. **WooCommerce outbound URL boundary allowed loopback/private hosts and plaintext HTTP.**
   - Fixed validation to reject userinfo-bearing URLs and loopback/private/link-local destinations.
   - Production now requires HTTPS.
   - Residual risk: hostname DNS can still resolve/rebind to private infrastructure after validation; a true network egress/SSRF control is still required for complete protection.

7. **Media upload accepted arbitrary MIME types despite the UI only advertising images/video.**
   - Added server-side allowlist for JPEG/PNG/WebP/GIF/MP4/WebM/QuickTime.
   - Size remains capped at 10 MB.
   - Added server-side signature validation for the supported JPEG/PNG/GIF/WebM/MP4/QuickTime types, with regression coverage.
   - Residual risk: this is lightweight signature validation, not full codec/container parsing or media-processing isolation.

### P1 — deferred / migration-sensitive

8. **Legacy social OAuth tokens are stored in plaintext columns.**
   - Meta callback writes access tokens into oauth_page_selections and social_accounts.
   - LinkedIn/Pinterest/Google Business similarly use legacy social-account token columns.
   - These are not equivalent to the encrypted commerce credential paths.
   - A safe fix requires additive encrypted columns plus a controlled read/write migration because in-place encryption cannot be safely performed from a schema migration without application key access.
   - Status: **deferred**, not accepted as secure.

9. **Rate limiting is not consistently enforced at the application boundary.**
   - OAuth endpoints depend primarily on provider controls; expensive/abuse-sensitive endpoints do not have a clearly centralized distributed limiter.
   - A serverless-safe shared limiter is required before launch for high-cost AI, uploads, auth initiation, and other abuse-sensitive operations.
   - Status: **deferred**.

## Credential read/write verification

### Verified encrypted application credential paths
- Shopify: lib/commerce/channels/credentials.ts uses AES-256-GCM and tenant-scoped queries.
- Amazon: lib/commerce/channels/amazon-credentials.ts uses AES-256-GCM with a dedicated AMAZON_TOKEN_ENCRYPTION_KEY and tenant-scoped reads/writes.
- Flipkart: lib/platforms/flipkart/credentials.ts uses AES-256-GCM with a dedicated FLIPKART_TOKEN_ENCRYPTION_KEY and tenant-scoped reads/writes.
- WooCommerce: lib/platforms/woocommerce/credentials.ts uses AES-256-GCM and tenant-scoped reads/writes.

### Verified plaintext legacy social paths
- Meta: callback writes access tokens into oauth_page_selections and social_accounts.
- Pinterest: OAuth callback writes token material into legacy social-account storage.
- LinkedIn: OAuth callback writes access token into legacy social-account storage.
- Google Business: OAuth callback writes token material into legacy social-account storage.

The audit does not assume encryption from documentation; the conclusions above are based on the actual source read/write paths.

## Tenant isolation
Core commerce channel reads/writes are scoped by user_id. Core social account listing/deletion and post creation validate the authenticated owner. The auth-recovery endpoint was a notable exception and has now been corrected.

## Security headers/cookies
Added baseline response headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and production Strict-Transport-Security.
Custom OAuth cookies are HttpOnly, SameSite=Lax, short-lived, and Secure in production.

## Verification status
### Implemented
- OAuth state hardening.
- OAuth initiation authentication for Pinterest/Google Business.
- Cross-tenant auth-recovery authorization.
- Webhook payload/signature log removal.
- WooCommerce URL hardening.
- Upload MIME allowlist.
- Baseline security headers.
- OAuth-state regression tests.

### Runtime verified
- CI `npm ci` now succeeds on the security branch with Node 22 and Next.js 16.3.8 manifest/lockfile alignment.
- Full CI is **not green**: lint fails on 238 repository-wide errors, predominantly pre-existing `no-explicit-any` debt; test suite reports 7 existing commerce/reconciliation failures outside the security patch.
- The security recovery endpoint's newly introduced `any` lint error was corrected before the latest CI run.
- No production deployment/runtime exercise has been performed.

### Externally verified
- Next.js security advisories/release status were checked against current public Next.js/GitHub advisory information.
- Provider live OAuth, webhook delivery, upload, and commerce API behavior were not externally exercised.

### Additional audit status

- CI workflow runtime was moved to Node 22 because the current OpenAI dependency requires Node >=22; this is a compatibility correction, not a security certification.
- Latest observed PR head is 701f97339b20080666be5066d8adca6dbd11d201. The PR remains open and unmerged.

### Remaining risks
- CI remains non-green due to pre-existing repository-wide lint/test debt; security-specific runtime behavior still needs targeted execution.
- P1: plaintext legacy social token storage.
- P1: distributed rate limiting.
- P1 residual: DNS-level SSRF/egress controls.
- P1 residual: full codec/container validation and media-processing isolation.
- Production secret rotation/incident-response posture was not externally verified.
- No security audit can establish that the deployed artifact exactly matches this branch without deployment/SBOM verification.

### 2026-10-08 continuation — LinkedIn token proxy
- **P1 important fixed:** removed the unused unauthenticated `app/api/linkedin/token` endpoint, which accepted an authorization code, performed the server-side LinkedIn token exchange, and returned the provider response directly.
- Source search found no application references to this endpoint. The authenticated LinkedIn callback remains the canonical code-exchange path.
- No database changes were made.
- This finding is now tracked as fixed; legacy social-token plaintext storage remains a separate migration-sensitive P1.


### Checkpoint — 2026-10-08 16:38 IST
- Branch: `v1/security-audit`
- PR: #49, open and unmerged.
- Latest head: `684c3e51e1df54b675d539783d0928fcca0c3ddf`.
- GitHub Actions reports no workflow runs for this exact head, so no CI result is claimed for it.
- No production deployment, live OAuth/provider exercise, or destructive database change was performed.


### 2026-10-08 continuation — OAuth comparison hardening
- Pinterest and Google Business callback state checks now use the shared constant-time `verifyOAuthState()` helper instead of direct string comparison.
- This is defense-in-depth; both flows already used high-entropy, HttpOnly, short-lived state cookies and authenticated callback sessions.
- Legacy social-token migration remains deferred because a safe additive dual-read/dual-write path requires complete consumer inventory and application-key access; no schema-only migration was introduced.


### 2026-10-08 continuation — legacy social-token consumer inventory

- Completed a source-level consumer inventory for the plaintext legacy social OAuth credentials.
- Confirmed `social_accounts.access_token`, `page_access_token`, and `refresh_token` are consumed by provider publishers, account-health checks, and the scheduler's `SELECT *` account-loading path.
- Confirmed `oauth_page_selections` is a temporary credential-bearing store used by Meta, Pinterest, and Google Business selection/reconnect flows; its token fields are deleted after the corresponding selection flow completes.
- Confirmed the Meta Page-selection JSON also carries Page access-token material and therefore cannot be treated as token-free merely because the SQL token column is migrated.
- Added `docs/DIZITO_SOCIAL_TOKEN_ENCRYPTION_MIGRATION.md` with the safe additive dual-read/dual-write migration sequence.
- No schema migration, backfill, plaintext-column removal, or destructive DB change was introduced.
- Status remains **P1 deferred / migration-sensitive** until the application credential boundary is implemented and verified.

## Scheduler tenant-boundary follow-up

- **P1 identified and fixed:** `lib/scheduler/processTarget.ts` previously loaded `social_accounts` by account ID alone before publishing. The lookup now requires both `social_accounts.id = $1` and `social_accounts.user_id = $2`, with the post owner supplied as `$2`.
- **Regression coverage added:** `lib/scheduler/processTarget.test.ts` verifies the tenant-scoped query parameters and verifies that a foreign-tenant account result prevents publishing.
- This protects the credential-bearing publisher context even if a malformed or cross-tenant `post_targets` relationship reaches the scheduler.
- No database migration was required or performed.
- GitHub Actions for the two fix commits returned no workflow runs; therefore this change is **source-implemented but not CI/runtime verified** in this checkpoint.

## OAuth error-response/logging follow-up

- **P1 identified and fixed:** LinkedIn OAuth token-exchange failures no longer log or return the raw provider token payload. Only HTTP status and non-secret error metadata are retained.
- **P1 identified and fixed:** Meta OAuth token-exchange failures no longer return the raw provider payload to the browser. The server logs only non-secret error metadata and returns a generic failure response.
- Successful OAuth token handling is unchanged.
- Runtime/provider verification remains pending.

## 2026-10-08 — Workstream D migration 019 / encrypted credential rollout

- Migration 019 is now applied to the Neon production/default branch after isolated-branch validation. The migration is additive only: encrypted columns were added to social_accounts and oauth_page_selections; no existing credential values were transformed or deleted. Meta, LinkedIn, Pinterest, and Google Business OAuth/account-selection paths now dual-write encrypted credential values, and scheduler/account-health/OAuth-selection reads prefer encrypted values with legacy fallback. Current Neon row-count verification found no existing encrypted rows because the current database has no active temporary OAuth selection rows and the two existing social accounts predate the migration. Backfill and plaintext retirement remain pending.

### 2026-10-08 — guarded legacy social credential backfill

- Added the controlled application-side backfill command for the already-applied migration 019.
- Current Neon verification remains: 2 `social_accounts` rows, 0 encrypted social rows, and 0 `oauth_page_selections` rows.
- The command fails closed without a valid `SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY` or `DATABASE_URL`, takes an advisory lock, uses a transaction, never logs credential material, and verifies coverage before completion.
- Actual execution is **not yet performed** because the deployment/runtime encryption key cannot be inspected through the available GitHub integration. Do not paste the secret into chat.
- This is not a runtime/provider verification result; legacy plaintext fields remain intentionally retained.

### 2026-10-08 — authorized legacy social-account cleanup

- User explicitly authorized deletion of the two remaining legacy `social_accounts` rows instead of performing a plaintext-to-encrypted backfill.
- Deleted account IDs `46` and `61` from the Neon production/default branch.
- Those rows had 2 dependent `post_targets`; the foreign key is `ON DELETE CASCADE`, so those target rows were removed automatically as part of the same transaction.
- Post-delete verification: 0 remaining rows for those account IDs, 0 remaining dependent targets, and 0 total `social_accounts` rows.
- No OAuth selection rows existed.
- This was an explicitly authorized destructive data operation; no other social-account rows existed at the time of deletion.


## 2026-10-08 — Post-cleanup security continuation

- Neon production/default branch was rechecked after the explicitly authorized legacy social-account deletion: social_accounts = 0 and oauth_page_selections = 0; no current credential backfill is required.
- Follow-up source audit fixed a Pinterest account-health refresh parameter-binding defect, corrected the LinkedIn reconnect account/user parameter binding, and added the missing social-credential encryption import used by the refresh path.
- Provider publisher errors were hardened so Facebook, Instagram, LinkedIn, and Pinterest no longer return raw provider error bodies through thrown errors; failures retain HTTP status context only.
- Meta's no-Pages error response no longer returns raw Page discovery provider payloads to the browser; only counts and the discovery source are exposed.
- These changes are source-level hardening; no live provider mutation or full CI pass is claimed.
- Remaining P1s: distributed/serverless-safe rate limiting, DNS-aware SSRF/network egress enforcement, full media processing isolation, production secret-rotation verification, and runtime/provider verification.


## 2026-10-08 — Credential retirement gate

A further source audit covered the Meta, LinkedIn, Pinterest, and Google Business callback/connect paths plus the scheduled account-health path. All current credential consumers that read `social_accounts` credentials pass through the encrypted-first resolver where credential material is consumed. The repository still contains deliberate plaintext dual-writes for legacy compatibility.

The plaintext write layer is **not retired in this checkpoint**. Although the production database currently contains zero social-account rows, removing the legacy writes or dropping the plaintext columns before a successful live provider-connect/reconnect exercise would make the change difficult to validate and could break an unobserved compatibility path. The correct next gate is runtime/provider verification of a fresh connection, reconnect, refresh, selection, and publish flow using the encrypted columns. After that gate passes, the plaintext writes can be removed first, followed by a separately reviewed schema-retirement migration.


## 2026-10-08 — Live database recheck changed the retirement gate

A subsequent Neon production recheck found a newly created Pinterest `social_accounts` row (id 62, user 8, account name `Poem`). Metadata-only inspection shows its access and refresh credentials are present in the legacy plaintext columns, while all three encrypted credential columns are currently empty and `credential_encryption_version` is null. No credential values were retrieved or logged.

This proves the credential migration is not yet effective for the currently active connection path/deployment. The row has not been deleted or modified in this checkpoint because no new destructive authorization was given for this newly created account. The immediate blocker is to identify why the live connection path bypassed the encrypted-write code, then either perform an authorized encrypted backfill or replace the row through a verified encrypted connection flow.

**Important status correction:** the database is no longer at zero social accounts. The earlier cleanup remains valid for IDs 46 and 61, but the current production state is 1 social account, 0 OAuth selection rows, and 0 orphaned social targets.


## 2026-10-08 — Pinterest live-write correction

The live connection was traced against the branch implementation after a new Pinterest account (id 62) appeared with plaintext access/refresh credentials. The active path was not bypassing the security branch: the branch itself was intentionally dual-writing plaintext for legacy compatibility.

The Pinterest path has now been advanced to the next migration gate:
- new Pinterest OAuth temporary-selection writes store credential material only in encrypted columns;
- Pinterest new-account and reconnect writes store encrypted credential material and clear the legacy plaintext token columns;
- Pinterest token-refresh writes store encrypted credential material and clear the legacy plaintext token columns;
- tenant predicates remain intact on reconnect/update operations.

This is source-implemented on `v1/security-audit`. Production database row 62 was **not directly modified or deleted** in this checkpoint. Existing legacy fallback reads remain temporarily available so the account can be migrated through a verified runtime path.

Runtime deployment/provider verification is still required. The next verification is to exercise the deployed Pinterest reconnect/health path and confirm that row 62 has encrypted credentials with no plaintext credential fields, without exposing credential values.


## 2026-10-08 — Social credential plaintext-write retirement across OAuth providers

Following the Pinterest live-state finding, the same migration gate was applied to the remaining credential-bearing social OAuth write paths.

- Meta/Facebook and Instagram callback/connect paths now persist access/page-access credentials only in encrypted columns.
- LinkedIn callback/reconnect paths now persist access credentials only in the encrypted column.
- Google Business callback/connect paths now persist access/refresh credentials only in encrypted columns.
- Pinterest remains encrypted-only as previously corrected.
- Temporary `oauth_page_selections` credential-bearing writes for Meta, Pinterest, and Google Business now keep plaintext token columns NULL while storing encrypted values.
- Encrypted-first legacy-fallback reads remain temporarily for existing legacy accounts and rollback compatibility.
- A source-level sweep of these seven credential write paths found no remaining direct parameterized writes to plaintext token columns.

Important: this is source-implemented only. No production deployment or live provider exercise is claimed, and account 62 remains unchanged in Neon. The plaintext schema columns cannot yet be dropped until deployed runtime verification and safe migration of any remaining legacy rows are complete.


## 2026-10-08 continuation — credential fail-closed boundary and distributed rate limiting

- **P1 credential read path hardened:** `resolveSocialAccountCredentials` no longer falls back to legacy plaintext `social_accounts` credential columns. Encrypted columns are the only accepted credential source; plaintext-only legacy rows now fail closed with an explicit migration-required error.
- Added regression coverage for encrypted resolution, malformed ciphertext rejection, and unmigrated plaintext fail-closed behavior.
- **P1 rate limiting implementation added:** new additive `api_rate_limits` storage and serverless-safe Postgres-backed `consumeRateLimit` helper use HMAC-hashed bucket/identifier keys and atomic window counters.
- Rate limits are applied to high-cost AI generation, AI image generation, media uploads, and authenticated Meta/LinkedIn/Pinterest/Google Business OAuth initiation.
- No destructive migration or production backfill was executed. The existing social-credential backfill/retirement process remains a deployment prerequisite for legacy rows.
- PR #55 contains the implementation. CI remains non-green because the repository's Test and Lint workflows still fail; this work is therefore not marked production-ready.


## 2026-10-09 — Workstream D focused regression continuation

- Fixed a security-test regression introduced by the distributed rate limiter: lib/security/rate-limit.test.ts was missing the closing ); for its test suite. The correction is committed on the security branch.
- Added an SSRF boundary around Amazon product-type schema retrieval. Schema URLs are now parsed and accepted only over HTTPS from the known Amazon SP-API hosts: sellingpartnerapi-na.amazon.com, sellingpartnerapi-eu.amazon.com, and sellingpartnerapi-fe.amazon.com. Non-Amazon, plaintext HTTP, and metadata-service-style URLs are rejected before network access.
- Added regression coverage for the Amazon schema-fetch SSRF boundary.
- Added distributed rate limiting to the signed direct-media upload initialization and completion endpoints in addition to the existing upload/generation limits.
- No production database migration or destructive data operation was executed in this continuation.
- CI remains a repository-wide issue: the previous Validate run exposed 238 lint errors and 78 warnings across unrelated existing files, plus the rate-limit test syntax error fixed above. A fresh post-fix workflow result is required before claiming the branch is CI-green.
- Remaining security focus: true DNS-aware/network-egress enforcement for any user-influenced outbound HTTP, media codec/container processing isolation, production secret-rotation/incident-response verification, and runtime/provider verification.
