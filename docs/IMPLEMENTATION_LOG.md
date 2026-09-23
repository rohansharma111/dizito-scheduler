# Dizito Implementation Log

## 2026-09-23 — WooCommerce publish attempt ledger and uncertainty handling

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:**
  - `115c5b60f7ddced178e52e395984818f8df9bd22` — create `commerce_publish_attempts` table.
  - `a18e84a3a803cde4ec5350bfa133e175ab35ccb1` — persist attempt lifecycle around provider publish.
  - `0c490f769b6b376570dce04ca87135c88e150aed` — safely replay completed attempts and block unresolved attempts.
  - `3e2dc77dae5808b4e582b9d6c2cbc1685c14f205` — classify likely network uncertainty as `ambiguous`.
- **Files:**
  - `db/migrations/009_woocommerce_publish_attempts.sql`
  - `lib/platforms/woocommerce/publish.ts`
- **Implemented behavior:**
  - When an idempotency key is supplied, a durable attempt row is created before the provider request.
  - The attempt stores tenant, channel, listing, provider, idempotency key, and request payload.
  - Successful provider responses persist `succeeded`, response payload, external ID, and completion time.
  - Ordinary provider or response-validation failures persist `failed`, error text, and completion time.
  - Likely network uncertainty, including timeout, connection reset/refusal, socket, and network errors, persists `ambiguous` instead of being treated as a confirmed provider failure.
  - A previously succeeded attempt can restore listing state and return the stored response without issuing another provider create request.
  - Attempts in `started` or `ambiguous` state are blocked with `PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION` rather than being blindly replayed.
  - Ambiguous attempts keep the listing in `syncing` and do not automatically mark the channel as errored.
- **Verification:**
  - Repository writes succeeded through GitHub.
  - Build, lint, type-check, automated tests, migration execution, and provider verification were not run.
- **Remaining risk:**
  - Error-message matching is heuristic and should be replaced or supplemented with provider/client error codes.
  - The attempt ledger does not yet reconcile an already-created provider product after a timeout.
  - Retry behavior and attempt-state transitions require mocked tests and a dedicated reconciliation workflow.
- **Next action:**
  - Add attempt lookup/reconciliation endpoints or jobs and mocked tests for success, provider failure, ambiguous timeout, and retry.

## 2026-09-23 — WooCommerce publish reconciliation endpoint

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:**
  - `ef2b8e800165f4a9a9b1aedad101e0584b581e84` — add WooCommerce product lookup support.
  - `7bf51076797b8c20b192b9c11a8cf18d1aa7c6c4` — add tenant-scoped reconciliation service.
  - `1619bc90aff8cb0c26aae0b697d6ce4da79ecdab` — add authenticated reconciliation API route.
- **Implemented behavior:**
  - Reconciliation requires the channel, listing, idempotency key, and externally observed WooCommerce product ID.
  - The attempt and listing are checked for tenant ownership.
  - WooCommerce is queried directly for the supplied product ID before local state is marked as successfully published.
  - A verified product updates the listing to `active` / `synced` and marks the attempt `succeeded` with the provider response.
  - Already reconciled attempts are not processed again.
- **Verification:**
  - Repository writes succeeded through GitHub.
  - Build, lint, type-check, automated tests, migration execution, and provider verification were not run.
- **Remaining risk:**
  - The workflow requires an externally known WooCommerce product ID; automatic discovery by SKU or payload fingerprint is not implemented.
  - It does not yet offer a background reconciliation job or admin UI.
