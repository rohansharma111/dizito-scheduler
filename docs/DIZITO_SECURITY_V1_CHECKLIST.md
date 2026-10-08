# Dizito V1 Security Checklist

**Status:** Pre-beta audit plan  
**Last updated:** 2026-10-07

> This checklist is not a certification. A checked source-level item must still be backed by the appropriate runtime/security evidence before Dizito is called production-ready.

## 1. Authentication
- [ ] session lifecycle audited;
- [ ] password/authentication flows audited;
- [ ] session fixation/replay reviewed;
- [ ] logout/revocation behavior verified;
- [ ] brute-force/rate limiting verified.

## 2. Authorization / tenant isolation
For every API mutation, verify:
`session → authenticated user → tenant/business → resource ownership → provider/channel ownership → mutation`.

Audit at minimum:
- posts;
- post targets;
- media;
- social accounts;
- commerce channels;
- listings;
- provider credentials;
- customer actions;
- attribution;
- weekly plans;
- campaigns;
- content items/variants;
- billing/subscriptions.

Never trust browser-supplied `userId`, `accountId`, `channelId`, `listingId` or external IDs without ownership checks.

## 3. OAuth
Audit Meta, Pinterest, Google, LinkedIn, Shopify, Amazon and future providers for:
- [ ] state/CSRF protection;
- [ ] PKCE where supported/appropriate;
- [ ] exact redirect URI validation;
- [ ] authorization-code replay prevention;
- [ ] token refresh/revocation;
- [ ] reconnect semantics;
- [ ] no credentials in URLs/logs;
- [ ] provider scopes limited to required capabilities.

## 4. Credentials / secrets
The repository contains credential-bearing fields such as social access tokens and provider credentials. Before beta, verify the actual write/read implementation rather than relying only on schema/documentation claims.

- [ ] access tokens encrypted at rest;
- [ ] refresh tokens encrypted at rest;
- [ ] page/provider tokens encrypted;
- [ ] encryption keys stored outside database;
- [ ] key versioning/rotation strategy;
- [ ] secrets never returned to client;
- [ ] secrets never included in structured logs;
- [ ] secrets never exposed in errors.

## 5. Webhooks
- [ ] signature verification;
- [ ] replay protection/idempotency;
- [ ] event identity persistence;
- [ ] duplicate delivery handling;
- [ ] out-of-order handling;
- [ ] provider timestamp validation where appropriate;
- [ ] safe retry behavior;
- [ ] no trust of unverified payload fields.

## 6. File/media security
Especially important for video:
- [ ] upload size limits;
- [ ] MIME validation;
- [x] actual file/content signature validation for supported upload types;
- [ ] codec/container validation where applicable;
- [ ] duration/dimension limits;
- [ ] image/video processing isolation;
- [ ] unsafe file types rejected;
- [ ] signed/direct upload strategy;
- [ ] no arbitrary remote URL fetch without SSRF protection.

Current application upload path buffers files and has a relatively small request-size limit. Large-video support should move toward direct signed Cloudinary uploads.

## 7. AI security
- [ ] tenant data is isolated from model prompts;
- [ ] user-supplied content cannot override system safety/business constraints;
- [ ] provider/API secrets never enter prompts;
- [ ] generated content is validated;
- [ ] malformed model output fails closed;
- [ ] human review cannot be bypassed;
- [ ] attribution is never fabricated;
- [ ] AI actions require explicit product authorization;
- [ ] usage limits prevent runaway cost.

## 8. API abuse / rate limiting
Apply appropriate rate limits to:
- login/auth;
- OAuth callbacks;
- AI generation;
- media upload;
- publishing;
- billing;
- webhook endpoints;
- expensive analytics/optimizer requests.

## 9. Logging / observability
Audit all logging for:
- access tokens;
- refresh tokens;
- provider secrets;
- authorization headers;
- payment secrets;
- unnecessary PII;
- full provider payloads containing credentials.

Introduce structured event IDs and safe redaction.

## 10. Database
- [ ] foreign keys reviewed;
- [ ] unique constraints reviewed;
- [ ] tenant-bound constraints reviewed;
- [ ] high-volume event retention defined;
- [ ] indexes reviewed using real query evidence;
- [ ] slow-query instrumentation enabled;
- [ ] migration rollback/recovery procedure documented;
- [ ] backups/recovery expectations verified.

Current Neon size is small; storage exhaustion is not a current risk.

## 11. Dependencies / platform
- [ ] npm audit/dependency review;
- [ ] Node runtime compatibility verified;
- [ ] Next.js security advisories reviewed;
- [ ] Vercel configuration reviewed;
- [ ] Cloudinary configuration reviewed;
- [ ] production environment variables audited;
- [ ] preview/staging environment secrets separated from production.

## 12. Headers / browser security
Audit:
- [ ] CSP;
- [ ] HSTS in production;
- [ ] X-Content-Type-Options;
- [ ] Referrer-Policy;
- [ ] frame protections;
- [ ] secure cookie flags;
- [ ] SameSite behavior;
- [ ] CORS policy.

## 13. Operational security
- [ ] account deletion/data-retention behavior;
- [ ] credential revocation;
- [ ] provider disconnect cleanup;
- [ ] support/admin access controls;
- [ ] audit trail for high-impact actions;
- [ ] incident response path;
- [ ] alerting for repeated provider/auth failures.

## 14. Security completion rule

Do not report “fully secure.”

Report:
- source-level controls implemented;
- controls runtime-verified;
- external/provider controls verified;
- remaining risks accepted/deferred.

Use OWASP ASVS as the external audit framework.

## 2026-10-08 Audit Addendum

See docs/DIZITO_SECURITY_AUDIT_2026-10-08.md for the source-level audit and finding classifications.

Implemented in v1/security-audit:
- OAuth state binding/session checks.
- Tenant authorization on auth recovery.
- Removal of raw Razorpay webhook logging.
- WooCommerce URL boundary hardening.
- Upload MIME allowlist.
- Baseline security headers.
- OAuth-state regression tests.

Open before launch:
- [x] Align Next.js and eslint-config-next to patched 16.3.8; npm ci succeeds with the matching lockfile. Full CI/runtime verification remains pending.
- [ ] Migrate legacy social OAuth tokens from plaintext storage to application-encrypted storage.
- [ ] Add distributed rate limiting for abuse-sensitive endpoints.
- [ ] Complete DNS-aware SSRF/egress controls for arbitrary commerce store hosts.
- [x] Add lightweight file signature validation for supported upload types. Full codec/container validation remains open if hostile uploads require it.


### 2026-10-08 continuation
- [x] Removed unused unauthenticated LinkedIn token-exchange proxy; canonical LinkedIn OAuth callback is authenticated and state-bound.
- [ ] Legacy social OAuth token columns still require additive application-encrypted migration.


### 2026-10-08 continuation
- [x] Pinterest and Google Business OAuth callbacks use shared constant-time state verification.
- [ ] Legacy social OAuth token migration remains pending; no schema-only encryption migration was introduced.


### 2026-10-08 continuation — credential migration inventory

- [x] Source-level inventory of legacy social OAuth token consumers completed.
- [x] Confirmed scheduler and account-health credential consumption paths.
- [x] Confirmed temporary OAuth-selection credential paths and Meta Page-token material inside selection JSON.
- [ ] Introduce server-only encrypted social credential repository/service.
- [ ] Additive encrypted columns and dual-write migration.
- [ ] Encrypted-first dual-read and migration-on-read.
- [ ] Verify migration coverage and remove legacy plaintext columns only after rollback/readiness checks.
