# Dizito Implementation Log

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
- **Implemented behavior:** Durable attempt rows, persisted success/failure/ambiguous states, idempotent replay, reconciliation blocking for `started`/`ambiguous`, and preservation of listing `syncing` state for ambiguous outcomes.
- **Verification:** Repository writes succeeded through GitHub. Migration source inspection confirmed the `ambiguous` status and required unique constraint. Build, lint, type-check, automated tests, migration execution, and provider verification were not run.

## 2026-09-23 — WooCommerce publish reconciliation endpoint

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:** `ef2b8e800165f4a9a9b1aedad101e0584b581e84`, `7bf51076797b8c20b192b9c11a8cf18d1aa7c6c4`, `1619bc90aff8cb0c26aae0b697d6ce4da79ecdab`, `93938e3c3df4921965b644a281ba3f976d8cc483`, `ecff17f154dedcc3340397b03b28f87db9e1ef41`, `f68062c696d4686b9102d481685f892344786319`, `3d7e7eab6291f8ac87b0acf7ac87a28ad8c8fdcc`, `339f2ec655a0807b1973ebc7c4917729b24a3cc4`, `b916ec2787a61f0a5786499e717406bf7bda6374`
- **Implemented behavior:** Reconciliation accepts an external WooCommerce product ID or exact SKU; validates tenant ownership and idempotency; rejects zero/multiple/SKU-mismatched matches; and transactionally marks verified listings and attempts successful.
- **Verification:** Repository writes succeeded through GitHub. Runtime build, lint, type-check, automated tests, migration execution, and provider verification remain pending.

## 2026-09-23 — WooCommerce reconciliation status lookup

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `baf498edc83d7abc65c3f4b4139500108bacc2d8`
- **File:** `app/api/commerce/woocommerce/reconcile/route.ts`
- **Implemented behavior:** Authenticated `GET` status lookup with tenant ownership checks, attempt state, provider, external ID, errors, timestamps, and linked listing sync state.
- **Verification:** Repository write succeeded through GitHub. Runtime behavior and automated tests remain unverified.

## 2026-09-23 — Transactional WooCommerce reconciliation completion

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `9a3a2a328d0e44a8875d4c74ed7e281ea7e84301`
- **File:** `lib/platforms/woocommerce/reconcile.ts`
- **Implemented behavior:** Locks the attempt row, rechecks state, updates listing and attempt in one transaction, and rolls back/releases the client on failure.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-23 — Reconciliation transaction row-count guards

- **Status:** Implemented; not yet verified in a running environment.
- **Commit:** `7c1bcc144a9592b07f655d6e0479e4dbb7b4ae2f`
- **File:** `lib/platforms/woocommerce/reconcile.ts`
- **Implemented behavior:** Checks exactly one listing and one publish-attempt row are updated; unexpected counts force rollback.
- **Verification:** Repository write succeeded through GitHub. Build, lint, type-check, automated tests, migration execution, and provider verification remain unrun.

## 2026-09-23 — Publish migration and repository verification review

- **Status:** Review completed; no code correction required.
- **Files reviewed:** `db/migrations/009_woocommerce_publish_attempts.sql`, `lib/platforms/woocommerce/publish.ts`, `package.json`.
- **Findings:** Migration 009 includes `ambiguous` and the unique constraint `(channel_id, listing_id, idempotency_key)` required by the publish upsert. The repository previously had no automated test script.
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

## 2026-09-24 — WooCommerce test tooling and coverage groundwork

- **Status:** Test files committed; execution pending.
- **Files:** `lib/platforms/woocommerce/mapper.test.ts`, `lib/platforms/woocommerce/client.test.ts`, `lib/platforms/woocommerce/client.request.test.ts`
- **Commits:** `3d495cebc6b81d40e69cbbadae56549678d85de6`, `852a0fe2c1ab32799c549061efdb1e2a2b585dab`, `6eb1a4911962031746fec1c18165d9340292c01d`
- **Coverage:** Mapper normalization/validation, client URL validation, authentication/header construction, request behavior, and provider error propagation.
- **Verification:** Tests were committed but not previously executed because the test script was missing.
