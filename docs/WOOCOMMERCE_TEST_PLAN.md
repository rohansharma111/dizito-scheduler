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

## Required test tooling decision

The repository currently has no test script or test framework. Before implementing these tests:

1. Select a TypeScript-compatible runner that works with the Next.js repository.
2. Add the runner and required type packages to `package.json`.
3. Update `package-lock.json` using the selected package manager.
4. Add a `test` script and a CI test step.
5. Start with pure validation and publish-service tests before adding provider contract tests.

## Exit criteria

The WooCommerce publish path must not be labelled production-ready until:

- the core scenarios above have automated coverage;
- the test command runs in CI;
- build, lint, type-check, and tests have recorded results;
- a controlled provider verification has been completed;
- failures and ambiguous outcomes are demonstrably reconciled safely.
