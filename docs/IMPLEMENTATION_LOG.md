# Dizito Implementation Log

## 2026-10-05 — WooCommerce reconciliation API error hardening

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `677ec48d9da7e3bdc5554c9401d2c8576f4a8ef8`
- **File:** `app/api/commerce/woocommerce/reconcile/route.ts`
- **Implemented behavior:**
  - Wraps reconciliation status database access in guarded error handling.
  - Returns `503 RECONCILIATION_STATUS_UNAVAILABLE` instead of exposing an unexpected database exception through the status endpoint.
  - Wraps reconciliation POST execution and returns a stable `RECONCILIATION_FAILED` response for unexpected provider/service exceptions.
  - Preserves existing validation and explicit domain-error HTTP mappings.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-24 — Enforce idempotency at WooCommerce publish service boundary

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `73482b8307f853a5000b224ea360f1e4aba70b81`
- **File:** `lib/platforms/woocommerce/publish.ts`
- **Implemented behavior:**
  - Requires a non-empty, trimmed idempotency key inside the publish service itself.
  - Returns `IDEMPOTENCY_KEY_REQUIRED` before channel or database work when the key is missing.
  - Removes the optional no-key path from the attempt-ledger flow so non-HTTP callers cannot accidentally bypass durable publish-attempt tracking.
  - Simplifies the publish path because every accepted request now creates or reuses a durable attempt row.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

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
- **Verification:** Repository writes succeeded through GitHub. The migration source was inspected and confirms the `ambiguous` status value and unique constraint required by the publish `ON CONFLICT (channel_id, listing_id, idempotency_key)` clause. Build, lint, type-check, automated tests, migration execution, and provider verification were not run.

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
- **Implemented behavior:** Reconciliation accepts either an externally observed WooCommerce product ID or an exact SKU. Empty identifiers are rejected at the service boundary as well as the API boundary. The attempt and listing are checked for tenant ownership. Only `started` and `ambiguous` attempts can be reconciled; failed attempts are not treated as uncertain provider outcomes. The listing's persisted idempotency key must match the requested key. SKU discovery requires exactly one WooCommerce match; zero matches, multiple matches, and SKU mismatches are rejected. When both external ID and SKU are supplied, the returned product's SKU is also verified. A verified product updates the listing to `active` / `synced` and marks the attempt `succeeded` with the provider response. Already reconciled attempts are not processed again.
- **Verification:** Repository writes succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification were not run.
- **Remaining risk:** SKU lookup relies on the provider's exact `sku` query behavior and needs mocked integration coverage. It does not yet offer a background reconciliation job or admin UI. Provider/network error classification remains heuristic.

## 2026-09-23 — WooCommerce reconciliation status lookup

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `baf498edc83d7abc65c3f4b4139500108bacc2d8`
- **File:** `app/api/commerce/woocommerce/reconcile/route.ts`
- **Implemented behavior:** Adds an authenticated `GET` endpoint alongside reconciliation `POST`. Requires `channelId`, `listingId`, and `idempotencyKey` query parameters. Returns attempt state, provider, external ID, error details, timestamps, and linked listing sync state. Applies tenant ownership checks to both the attempt and listing in one query. Returns `404` when no matching tenant-owned attempt exists.
- **Verification:** Repository write succeeded through GitHub. Runtime behavior, database execution, and automated tests remain unverified.

## 2026-09-23 — Transactional WooCommerce reconciliation completion

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `9a3a2a328d0e44a8875d4c74ed7e281ea7e84301`
- **File:** `lib/platforms/woocommerce/reconcile.ts`
- **Implemented behavior:** Locks the publish attempt row inside a database transaction before applying reconciliation state changes, rechecks status after locking, updates listing and attempt success state in one transaction, and rolls back/releases the client on failure.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-23 — Reconciliation transaction row-count guards

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `7c1bcc144a9592b07f655d6e0479e4dbb7b4ae2f`
- **File:** `lib/platforms/woocommerce/reconcile.ts`
- **Implemented behavior:** Checks that exactly one listing row and one publish-attempt row are updated; unexpected counts force rollback.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-23 — Publish migration and repository verification review

- **Status:** Review completed; no code correction required.
- **Files reviewed:** `db/migrations/009_woocommerce_publish_attempts.sql`, `lib/platforms/woocommerce/publish.ts`, `package.json`.
- **Findings:** Migration 009 includes `ambiguous` and the unique constraint `(channel_id, listing_id, idempotency_key)`. The repository defines `build`, `lint`, `start`, `dev`, and `db:migrate`, but no automated test script.
- **Verification limits:** Source inspection only; no local command execution, build, lint, type-check, migration execution, database test, or provider test was performed.

## 2026-09-24 — Require idempotency key for live WooCommerce publishing

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `87fe8a6a1804f5ceb50fff803246d3649fdffe54`
- **File:** `app/api/commerce/woocommerce/publish/route.ts`
- **Implemented behavior:** Authenticated live-publish requests without a non-empty `idempotencyKey` return HTTP `400` before the publish service is called.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-24 — CI quality workflow

- **Status:** Workflow committed; execution pending.
- **Commit:** `6301f8d9fbd6c10a8557cc20d0307d08929be949`
- **File:** `.github/workflows/quality.yml`
- **Implemented behavior:** Runs on pushes and pull requests targeting `main`, uses Node.js 20/npm caching, and runs `npm ci`, `npm run lint`, and `npm run build`.
- **Verification:** Workflow file committed successfully; no workflow run was available for the commit, so lint/build success is not claimed.
- **Remaining limitation:** The repository still has no automated test script; mocked integration coverage remains a separate follow-up.
