# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + verified listing mutation contract + idempotent publish preparation + validated drafts + read-only client + token-refresh foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled

## Verified provider capabilities

The official Flipkart Seller API v3 documentation and Flipkart's official Java SDK verify:

- OAuth Authorization Code flow for third-party partners/aggregators.
- Bearer-token authenticated Seller APIs.
- `GET /listings/v3/{skuIds}` for listing retrieval.
- `POST /listings/v3` for listing creation.
- `POST /listings/v3/update` for listing updates.
- `POST /listings/v3/update/inventory` for inventory updates.
- `POST /listings/v3/update/price` for price updates.
- The verified `CreateListingRequest` / `UpdateListingRequest` contract.

## Implemented files

- OAuth/authentication files under `lib/platforms/flipkart/` and `app/api/commerce/flipkart/`.
- `lib/platforms/flipkart/client.ts` — environment-aware bearer client, timeout, expiry enforcement, automatic refresh, tenant checks, and read-only listing operations.
- `lib/platforms/flipkart/mapper.ts` — canonical product/variant draft mapping.
- `lib/platforms/flipkart/draft.ts` — tenant-safe draft persistence with `publishReady: false`.
- `lib/platforms/flipkart/listing-payload.ts` — verified Create/Update request model based on Flipkart's official SDK.
- `lib/platforms/flipkart/publish.ts` — tenant-safe publish preparation with required idempotency key.
- `lib/commerce/publish/operations.ts` — provider-neutral publish-operation ledger.

## Idempotency and reconciliation foundation

Migration `003_commerce_publish_operations.sql` adds a provider-neutral operation ledger.

Each operation records:

- tenant/user
- listing
- provider
- operation type (`create`, `update`, `inventory`, `price`)
- caller-supplied idempotency key
- SHA-256 request fingerprint
- lifecycle status
- attempt count
- provider external ID when known
- bounded error information and timestamps

The preparation service:

1. Verifies listing ownership.
2. Creates the operation atomically.
3. Returns an existing operation when the same tenant/provider/idempotency key and payload are reused.
4. Rejects reuse of the same key for another listing.
5. Rejects reuse of the same key with a different payload.

Ambiguous provider outcomes can be represented as `unknown`. This is intentional: an HTTP timeout after a provider accepted a mutation must not automatically be treated as a safe-to-retry failure.

## Current publish boundary

Flipkart publish preparation now requires:

- an owned active Flipkart channel
- an owned product listing
- a verified Flipkart mutation payload
- an explicit idempotency key

It creates or reuses an operation record but **does not perform the provider mutation**.

## Deliberately not implemented yet

- Actual live `POST /listings/v3` execution.
- Actual live `POST /listings/v3/update` execution.
- Provider-side reconciliation after ambiguous responses.
- Inventory/price synchronization.
- Runtime provider verification with approved seller credentials.
- Provider category/attribute discovery and canonical mapping.
- Multi-Flipkart-account support based on a verified seller identifier.

## Verification limitations

The listing mutation contract is based on Flipkart's official Java SDK and documentation. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session because repository cloning from the execution environment was blocked by DNS/network resolution. No credentials or live merchant data were used.
