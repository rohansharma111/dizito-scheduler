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

## 2026-09-23 — WooCommerce publish reconciliation endpoint

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:**
  - `ef2b8e800165f4a9a9b1aedad101e0584b581e84` — add WooCommerce product lookup support.
  - `7bf51076797b8c20b192b9c11a8cf18d1aa7c6c4` — add tenant-scoped reconciliation service.
  - `1619bc90aff8cb0c26aae0b697d6ce4da79ecdab` — add authenticated reconciliation API route.
  - `93938e3c3df4921965b644a281ba3f976d8cc483` — require reconcilable attempt states and matching listing idempotency key.
  - `ecff17f154dedcc3340397b03b28f87db9e1ef41` — map reconciliation validation and conflict errors to HTTP responses.
  - `f68062c696d4686b9102d481685f892344786319` — add exact WooCommerce SKU lookup support.
  - `3d7e7eab6291f8ac87b0acf7ac87a28ad8c8fdcc` — add guarded SKU-based reconciliation discovery.
  - `339f2ec655a0807b1973ebc7c4917729b24a3cc4` — expose SKU-based reconciliation through the authenticated API.
  - `b916ec2787a61f0a5786499e717406bf7bda6374` — verify SKU even when reconciliation starts from an external product ID.
- **Implemented behavior:**
  - Reconciliation accepts either an externally observed WooCommerce product ID or an exact SKU.
  - Empty identifiers are rejected at the service boundary as well as the API boundary.
  - The attempt and listing are checked for tenant ownership.
  - Only `started` and `ambiguous` attempts can be reconciled; failed attempts are not treated as uncertain provider outcomes.
  - The listing's persisted idempotency key must match the requested key.
  - SKU discovery requires exactly one WooCommerce match; zero matches, multiple matches, and SKU mismatches are rejected.
  - When both external ID and SKU are supplied, the returned product's SKU is also verified.
  - A verified product updates the listing to `active` / `synced` and marks the attempt `succeeded` with the provider response.
  - Already reconciled attempts are not processed again.
- **Verification:**
  - Repository writes succeeded through GitHub.
  - Build, lint, type-check, automated tests, migration execution, and provider verification were not run.
- **Remaining risk:**
  - SKU lookup relies on the provider's exact `sku` query behavior and needs mocked integration coverage.
  - It does not yet offer a background reconciliation job or admin UI.
  - Provider/network error classification remains heuristic.
