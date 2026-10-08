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
