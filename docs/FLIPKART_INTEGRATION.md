# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + verified listing mutation contract + idempotent publish preparation + fail-closed mutation executor + read-before-retry reconciliation
- Status: Implemented; repository/runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Disabled by default
- Latest status update: 2026-10-06

## Completed implementation

### Authentication and credentials

- Verified Flipkart third-party Authorization Code OAuth flow.
- Added signed, user-bound OAuth state validation and callback handling.
- Added encrypted credential persistence using `FLIPKART_TOKEN_ENCRYPTION_KEY`.
- Added tenant-scoped credential reads.
- Added automatic access-token refresh with an advisory transaction lock.
- Added expiry/skew protection at the request boundary.
- Kept Flipkart app credentials inside the encrypted credential payload; no plaintext credential logging.

### Listing preparation

- Added validated product/variant draft mapping.
- Added persisted Flipkart listing drafts through the shared commerce listing model.
- Verified listing mutation models against the official Flipkart Seller API Java SDK.
- Added validation for price, tax, package, location, and fulfillment fields.
- Added provider payload conversion to the verified snake_case contract.

### Publish safety

- Added `commerce_publish_operations` for tenant-scoped idempotency and request fingerprints.
- Added create/update publish preparation.
- Added a fail-closed mutation executor.
- Added explicit timeout/unknown outcome classification.
- Added reconciliation as a required step before marking a marketplace mutation succeeded.
- Live publishing remains disabled unless `FLIPKART_LIVE_PUBLISH_ENABLED=true` is explicitly configured.

## Current publish lifecycle

The persisted operation lifecycle is:

`prepared` → `in_progress` → **provider submission** → reconciliation → `succeeded`

Ambiguous transport outcomes follow:

`in_progress` → `unknown` → reconciliation → `succeeded` / manual resolution

The implementation deliberately does **not** infer marketplace success from an HTTP response alone.

## Current repository status

The following Flipkart integration areas are present on `feature/commerce-flipkart`:

- `lib/platforms/flipkart/client.ts`
- `lib/platforms/flipkart/credentials.ts`
- `lib/platforms/flipkart/token-refresh.ts`
- `lib/platforms/flipkart/refresh-service.ts`
- `lib/platforms/flipkart/auth.ts`
- `lib/platforms/flipkart/mapper.ts`
- `lib/platforms/flipkart/draft.ts`
- `lib/platforms/flipkart/listing-payload.ts`
- `lib/platforms/flipkart/publish.ts`
- `lib/platforms/flipkart/reconcile.ts`
- `app/api/commerce/flipkart/connect/route.ts`
- `app/api/commerce/flipkart/callback/route.ts`
- `db/migrations/003_commerce_publish_operations.sql`

## Verification status

### Verified from authoritative sources

- Flipkart Seller API OAuth onboarding contract.
- Authorization Code and refresh-token endpoints.
- Access/refresh token lifetime and proactive refresh guidance.
- Listing create/update request models and required fields.
- Listing status and fulfillment profile enums.
- Price, tax, package, location, fulfillment, shipping, address-label, and dating-label models.

### Not yet runtime-verified

- Local lint/typecheck/build execution has not been completed in this environment.
- No real Flipkart credentials have been used.
- No live or sandbox marketplace mutation has been executed.
- No provider mutation response fixture has yet been captured from an approved sandbox/merchant environment.
- Exact provider response-to-external-ID mapping therefore remains intentionally unimplemented.

## Remaining work before production enablement

1. Obtain an approved sandbox/merchant mutation response fixture.
2. Verify the exact create/update response shape and external listing identifier.
3. Implement response parsing only against that verified shape.
4. Persist confirmed external IDs to `product_listings` and `product_listing_variants`.
5. Harden operation-state transitions so already-completed operations cannot be restarted accidentally.
6. Add tenant-scoped operation lookup/validation for reconciliation and confirmation.
7. Add automated tests for payload validation, idempotency conflicts, timeout classification, operation transitions, and reconciliation.
8. Run repository CI successfully: lint, TypeScript validation, and production build.
9. Perform an explicitly approved sandbox mutation test.
10. Only after those gates pass, consider enabling `FLIPKART_LIVE_PUBLISH_ENABLED`.

## Safety boundary

No live mutation has been executed by this implementation.

The live-publish environment flag must remain unset/false until the verified response contract, reconciliation behavior, automated tests, and approved sandbox mutation test are complete.

## Recent implementation history

- OAuth onboarding and callback flow completed.
- Verified listing mutation contract added from official SDK models.
- Idempotent publish operation persistence added.
- Fail-closed create/update mutation executor added.
- Read-before-retry reconciliation foundation added.
- Documentation/status tracking updated here to reflect the current implementation boundary.

## Next implementation target

The next engineering target is **publish-operation lifecycle hardening and verified response reconciliation**. This should proceed without enabling live publishing: first verify the provider response contract, then safely persist confirmed external identifiers, and finally add/execute the automated test coverage and approved sandbox verification.

