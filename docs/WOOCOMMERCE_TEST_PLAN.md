# WooCommerce Publish and Reconciliation Test Plan

## Purpose

Define the minimum automated coverage required before WooCommerce live publishing can be considered for controlled merchant use.

This document is a test plan, not evidence that the scenarios have already passed.

## Test layers

### 1. Pure validation tests

- Reject missing `channelId`, `listingId`, `idempotencyKey`, or payload.
- Reject non-object payloads and arrays.
- Require `confirmLivePublish === true` in the service layer.
- Preserve the same idempotency key across retries.

### 2. Publish service tests

Use mocked database and WooCommerce client boundaries.

- Successful provider creation:
  - persist external product ID;
  - mark listing as active/synced;
  - persist attempt as `succeeded`;
  - store the response safely.
- Repeated request with the same key after success:
  - return the recorded result;
  - do not call WooCommerce again.
- Existing unresolved attempt:
  - return `PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION`;
  - do not issue a second provider request.
- Provider rejection:
  - persist failed attempt state;
  - persist listing error state;
  - mark the channel error where applicable.
- Network timeout or uncertain transport failure:
  - persist `ambiguous` attempt state;
  - retain the listing in a reconciliation-required state;
  - avoid claiming that the provider did not create the product.
- Mismatched idempotency key:
  - reject the request without a provider call.
- Already-published listing:
  - reject creation unless an explicit update workflow exists.

### 3. Reconciliation service tests

- Reconcile by external product ID.
- Reconcile by SKU when exactly one provider product matches.
- Reject SKU reconciliation when zero or multiple products match.
- Reject an external ID that does not match the returned provider product.
- Reject attempts that are already `succeeded` or `failed`.
- Require the same idempotency key as the original attempt.
- Enforce tenant ownership for channel, listing, and attempt records.
- Confirm that transaction row-count guards roll back on unexpected update counts.
- Confirm that concurrent reconciliation cannot complete the same attempt twice.

### 4. API route tests

- Unauthenticated requests return `401`.
- Invalid request bodies return `400`.
- Ownership and missing-resource cases return the documented status codes.
- Conflict states return `409`.
- Successful publish returns the external ID and result without credentials.
- Reconciliation GET returns only tenant-authorized attempt and listing state.

### 5. Provider contract tests

Use a controlled WooCommerce test store or deterministic HTTP mock.

- Simple product creation.
- Variable product creation with variations.
- Provider validation error.
- Authentication failure.
- Malformed provider response.
- Slow response and transport interruption.
- External product lookup by ID.
- Product lookup by SKU.

## Current test tooling and coverage

The repository uses Vitest (`npm test` runs `vitest run`) and GitHub Actions Validate / Quality Checks. Existing WooCommerce coverage includes publish service tests, publish-state decision tests, reconciliation identity tests, reconciliation integration-style tests with mocked provider/database boundaries, adapter/provider tests, and publish API error mapping.

Coverage reviewed on 2026-10-09:
- explicit confirmation and idempotency key requirements;
- tenant-scoped channel ownership;
- successful provider creation and no duplicate provider call on a completed replay;
- unresolved attempt blocks another provider request;
- transport timeout is marked ambiguous;
- already-linked listing blocks duplicate creation;
- reconciliation verifies provider ID/SKU identity, rejects multiple SKU matches, prevents a second reconciliation, and rolls back on persistence failures.

Remaining evidence gaps:
- Run the full current test suite and preserve CI links for the exact code SHA after any test additions.
- Deterministic external-ID conflict and concurrent-reconciliation race-guard tests are committed; CI verification for the latest test SHA is pending.
- HTTP contract tests now cover simple-product creation request shape, external-ID/SKU lookup encoding, REST-route fallback after 404, sanitized authentication errors, and aborted requests. Variable-product payload validation, provider validation-error cases, malformed successful responses, and real test-store verification remain open.
- Browser/API verification is distinct from unit tests; record it separately.

## Exit criteria

The WooCommerce publish path must not be labelled production-ready until:

- the core scenarios above have automated coverage;
- the test command runs in CI;
- build, lint, type-check, and tests have recorded results;
- a controlled provider verification has been completed;
- failures and ambiguous outcomes are demonstrably reconciled safely.


## 2026-10-09 — Linking/publish safety audit continuation

- Added a publish-service regression test proving a listing already linked to a WooCommerce external ID is rejected with `LISTING_ALREADY_PUBLISHED` before credentials are loaded or a provider mutation is attempted.
- Existing publish flow reserves an idempotency-scoped attempt before the provider call; started/ambiguous attempts require reconciliation, completed attempts replay without a provider call, and external-ID conflicts are checked under an advisory transaction lock. Reconciliation verifies provider identity/SKU and uses row-count guards with transaction rollback.
- This is source/test coverage review, not a claim of live-store publish verification. No provider write was triggered.


## 2026-10-09 — Reconciliation conflict/race regressions

- Added an integration-style test proving reconciliation rolls back and performs no listing/attempt updates when another listing already owns the WooCommerce external ID.
- Added a race-guard test proving a reconciliation request that acquires the attempt lock after another request completed returns `PUBLISH_ATTEMPT_ALREADY_RECONCILED` and does not apply a second set of updates.
- CI for the exact test commit is pending; these mocked database tests do not substitute for provider contract checks or live-store verification.


## 2026-10-09 — HTTP provider contract tests

- Added deterministic HTTP-mock coverage for WooCommerce simple-product creation, product ID/SKU lookups, 404 REST-route fallback, sanitized 401 errors, and abort/timeout mapping.
- These tests do not contact a WooCommerce store and do not prove real-store credentials, permissions, product validation, or variable-product behavior.
- CI is pending for the latest code and documentation commits.
