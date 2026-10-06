# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + verified listing mutation contract + validated drafts + read-only client + token-refresh foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled
- Database migration: No new Flipkart-specific migration required

## Verified provider capabilities

The official Flipkart Seller API v3 documentation and Flipkart's official Java SDK verify:

- OAuth Authorization Code flow for third-party partners/aggregators.
- Bearer-token authenticated Seller APIs.
- `GET /listings/v3/{skuIds}` for listing retrieval.
- `POST /listings/v3` for listing creation.
- `POST /listings/v3/update` for listing updates.
- `POST /listings/v3/update/inventory` for inventory updates.
- `POST /listings/v3/update/price` for price updates.
- Production and sandbox listing API base URLs.
- The verified `CreateListingRequest` / `UpdateListingRequest` contract.

The official SDK defines the core listing mutation fields as product ID, price, tax, listing status, fulfillment profile, packages, and locations, with optional shipping fees, subsidized shipping, fulfillment, address labels, and dating labels. The SDK also defines the corresponding nested models and enums.

## Implemented files

- `lib/platforms/flipkart/auth.ts`
  - Third-party OAuth URL, signed user-bound state, authorization-code exchange, HTTPS callback enforcement, and bounded token exchange.
- `app/api/commerce/flipkart/connect/route.ts`
  - Authenticated OAuth initiation.
- `app/api/commerce/flipkart/callback/route.ts`
  - Authenticated callback, state validation, encrypted credential persistence, and channel activation.
- `lib/platforms/flipkart/client.ts`
  - Environment-aware bearer client, timeout, expiry enforcement, automatic refresh, tenant checks, and read-only listing operations.
- `lib/platforms/flipkart/credentials.ts`
  - Encrypted credentials and expiry persistence.
- `lib/platforms/flipkart/token-refresh.ts`
  - Verified refresh-token grant implementation.
- `lib/platforms/flipkart/mapper.ts`
  - Canonical product/variant draft mapping and validation.
- `lib/platforms/flipkart/draft.ts`
  - Tenant-safe draft persistence with `publishReady: false`.
- `lib/platforms/flipkart/listing-payload.ts`
  - Verified Create/Update listing request model based on Flipkart's official SDK.
  - Validates required product, price, tax, package, and location data.
  - Uses only documented enum values.
  - Produces the provider payload without performing a network mutation.
- `lib/platforms/flipkart/publish.ts`
  - Tenant-safe publish preparation boundary.
  - Validates the verified mutation contract.
  - Explicitly returns `livePublishEnabled: false`.

## Verified mutation contract

Create/update payloads use the documented fields:

- `product_id`
- `price`
- `tax`
- `listing_status`
- `fulfillment_profile`
- `packages`
- `locations`
- optional `shipping_fees`
- optional `subsidized_shipping`
- optional `fulfillment`
- optional `address_label`
- optional `dating_label`

The official SDK defines the listing status values `ACTIVE` and `INACTIVE`, and fulfillment profiles `NON_FBF`, `FBF_LITE`, and `FBF`.

## Required configuration

For third-party onboarding, configure:

- `FLIPKART_CLIENT_ID`
- `FLIPKART_CLIENT_SECRET`
- `FLIPKART_REDIRECT_URI` — registered HTTPS callback URL.
- `FLIPKART_ENVIRONMENT` — optional; defaults to `production`, and may be `sandbox`.
- `FLIPKART_TOKEN_ENCRYPTION_KEY`

## Security notes

- Credentials are encrypted at rest.
- OAuth state is short-lived, signed, HttpOnly, and bound to the authenticated Dizito user.
- Application credentials are used only server-side.
- Requests reject expired or soon-to-expire access tokens.
- Refresh responses rotate the stored refresh token.
- Draft/publish preparation validates tenant ownership through the shared commerce services.
- No live mutation is currently reachable through the Flipkart integration.

## Deliberately not implemented yet

- Actual `POST /listings/v3` execution.
- Actual `POST /listings/v3/update` execution.
- Inventory/price synchronization.
- Idempotency/reconciliation around provider mutations.
- Runtime provider verification with approved seller credentials.
- Provider category/attribute discovery and canonical mapping.
- Multi-Flipkart-account support based on a verified seller identifier.

## Verification limitations

The listing mutation contract is now based on Flipkart's official Java SDK rather than assumptions. The official documentation confirms the endpoints, while the official SDK exposes the request and nested model schemas.

Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session because repository cloning from the execution environment was blocked by DNS/network resolution. No credentials or live merchant data were used.
