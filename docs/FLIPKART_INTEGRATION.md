# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + verified listing mutation contract + idempotent publish preparation + fail-closed mutation executor + read-before-retry reconciliation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Disabled by default

## Mutation executor

`lib/platforms/flipkart/publish.ts` now contains the provider mutation execution boundary.

Supported operation paths:

- create → `POST /listings/v3`
- update → `POST /listings/v3/update`

Execution is fail-closed unless:

`FLIPKART_LIVE_PUBLISH_ENABLED=true`

is explicitly configured.

Even when enabled:

1. The operation is marked `in_progress`.
2. The tenant-scoped Flipkart credentials are loaded.
3. The verified payload is sent to Flipkart.
4. A normal provider response is returned as `submitted`, not `succeeded`.
5. Timeout/ambiguous outcomes become `unknown`.
6. A reconciliation step must confirm the external listing ID before the operation becomes `succeeded`.
7. Non-timeout failures become `failed`.

This avoids treating a transport-level success or failure as proof of the final marketplace state.

## Reconciliation

`lib/platforms/flipkart/reconcile.ts` performs a provider read using the verified listing GET endpoint. It intentionally does not guess the external ID from an unverified response shape.

The intended lifecycle is:

`prepared` → `in_progress` → `submitted` → **reconcile** → `succeeded`

or:

`in_progress` → `unknown` → **reconcile** → `succeeded` / manual resolution

## Remaining before production enablement

- Obtain a verified sandbox/approved-seller mutation response fixture.
- Implement exact external-ID extraction from the verified response.
- Persist confirmed external IDs to `product_listings` / `product_listing_variants`.
- Add automated tests for payload validation, idempotency conflicts, timeout classification, and reconciliation.
- Perform an explicit approved sandbox mutation test.
- Only then consider enabling `FLIPKART_LIVE_PUBLISH_ENABLED`.

No live mutation has been executed by this implementation.
