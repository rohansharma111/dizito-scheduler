# Dizito Implementation Log

## 2026-10-06 — Bind WooCommerce reconciliation to listing identity

- **Status:** Implemented; automated tests passed in GitHub Actions, while repository lint remains failing.
- **Commits:**
  - `4b20471e615b1e4117f29271fb32ec47d47ee820` — harden reconciliation identity and API error mapping.
  - `b70448f84393da421a6225ef475e7e539ee3d8c5` — add reconciliation identity unit tests.
- **Files:** `lib/platforms/woocommerce/reconcile.ts`, `app/api/commerce/woocommerce/reconcile/route.ts`, `lib/platforms/woocommerce/reconcile.test.ts`
- **Implemented behavior:**
  - Reconciliation reads the expected WooCommerce SKU from the listing's persisted draft payload.
  - A caller-supplied SKU must match the listing SKU when both are present.
  - External-ID reconciliation additionally verifies that the provider product SKU matches the listing identity before marking the attempt successful.
  - SKU-based reconciliation continues to require exactly one provider match.
  - Added focused tests for missing, inherited, conflicting, and matching SKU identities.
- **Verification:** GitHub Actions run `37417617314` completed the Vitest test step successfully. The same run failed at repository lint, so the full quality workflow is not green. No provider/live WooCommerce verification is claimed.

## 2026-10-05 — Enable automated Vitest execution in CI

- **Status:** Implemented; test execution still requires the GitHub Actions run to complete.
- **Commits:**
  - `5bdbf1bac424722dfb2c98319d5f471f2e8fe727` — add `test` and `test:watch` scripts to `package.json`.
  - `ee11425b2015bef8ab57def60f1394482fbcd113` — run `npm test` in the quality workflow before lint/build.
- **Finding:** Vitest `^2.1.9` was already present in `package.json` and `package-lock.json`; a new dependency installation was therefore unnecessary.
- **Implemented behavior:**
  - `npm test` now runs `vitest run`.
  - `npm run test:watch` provides the local watch-mode runner.
  - CI installs dependencies with `npm ci`, executes the Vitest suite, then runs lint and build.
- **Verification:** Repository writes succeeded through GitHub. The actual Vitest, lint, and build results must be taken from the resulting GitHub Actions run; they are not claimed here without execution evidence.

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
- **Files:** `db/migrations/009_woocommerce_publish_attempts.sql`, `lib/platforms/woocommerce/publish.ts`
- **Implemented behavior:** Durable attempt rows, persisted success/failure/ambiguous states, idempotent replay, reconciliation blocking for `started`/ambiguous, and preservation of listing `syncing` state for ambiguous outcomes.
- **Verification:** Repository writes succeeded through GitHub. Migration source inspection confirmed the `ambiguous` status and required unique constraint. Build, lint, type-check, automated tests, migration execution, and provider verification were not run.

## 2026-09-23 — WooCommerce publish reconciliation endpoint

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:** `ef2b8e800165f4a9a9b1aedad101e0584b581e84`, `7bf51076797b8c20b192b9c11a8cf18d1aa7c6c4`, `1619bc90aff8cb0c26aae0b697d6ce4da79ecdab`, `93938e3c3df4921965b644a281ba3f976d8cc483`, `ecff17f154dedcc3340397b03b28f87db9e1ef41`, `f68062c696d4686b9102d481685f892344786319`, `3d7e7eab6291f8ac87b0acf7ac87a28ad8c8fdcc`, `339f2ec655a0807b1973ebc7c4917729b24a3cc4`, `b916ec2787a61f0a5786499e717406bf7bda6374`
- **Implemented behavior:** Reconciliation accepts an external WooCommerce product ID or exact SKU; validates tenant ownership and idempotency; rejects zero/multiple/SKU-mismatched matches; and transactionally marks verified listings and attempts successful.
- **Verification:** Repository writes succeeded through GitHub. Runtime build, lint, type-check, automated tests, migration execution, and provider verification remain pending.

## 2026-09-23 — WooCommerce reconciliation status lookup

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `...`
