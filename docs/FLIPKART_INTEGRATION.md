# Flipkart Commerce Integration

## Status

- Phase: Read-only client and token-refresh foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled
- Database migration: No new Flipkart-specific migration required

## Verified provider capabilities

The official Flipkart Seller API v3 documentation describes:

- OAuth client-credentials flow for self-access applications.
- OAuth authorization-code flow for third-party applications.
- Bearer-token authenticated Seller APIs.
- Refresh-token access-token generation for approved sellers.
- Access-token validity of 60 days and refresh-token validity of 180 days in the documented refresh flow.
- Listing retrieval by SKU.
- Listing details retrieval by SKU.
- Listing search with listing-status filters and pagination.
- Listing creation, listing updates, price updates, inventory updates, and activation/deactivation.

The implementation intentionally exposes only read-only listing operations. No live mutation endpoint is wired into Dizito yet.

## Implemented files

- `lib/platforms/flipkart/client.ts`
  - Environment-aware production/sandbox base URL selection.
  - Bearer-token request wrapper.
  - Bounded 15-second timeout when the caller does not provide an abort signal.
  - Explicit timeout error handling without exposing response bodies or credentials.
  - Expiry-aware channel configuration checks with a 60-second safety skew.
  - Request-boundary expiry enforcement for direct calls to `flipkartRequest`.
  - Read-only listing lookup.
  - Read-only listing details lookup.
  - Listing search.
  - Tenant-scoped channel provider/status checks.
  - Channel error metadata helper.
- `lib/platforms/flipkart/credentials.ts`
  - Encrypted credential payload storage using the existing provider-neutral credential table.
  - Access-token retrieval for server-side use.
  - Optional refresh-token and application credential fields stored inside the encrypted payload.
  - Access-token and refresh-token expiry persistence using the existing timestamp columns.
  - Date validation before expiry metadata is written.
- `lib/platforms/flipkart/token-refresh.ts`
  - Verified Flipkart `refresh_token` grant request.
  - Basic-authenticated token endpoint request using an injected authorization header.
  - Bounded 15-second timeout.
  - Strict validation of returned access token, refresh token, and expiry values.
  - No logging or exposure of token response bodies.

## Credential and security notes

- Credentials are stored in `commerce_channel_credentials.access_token_encrypted`.
- The existing provider-neutral table is created by `db/migrations/002_shopify_channel_credentials.sql`; its schema is not Shopify-exclusive.
- The credential payload is never returned by the client helper.
- The encryption key is read only from `FLIPKART_TOKEN_ENCRYPTION_KEY`.
- Channel provider, active-status, and authenticated-user ownership checks are required before requests are made through `getFlipkartChannelConfig`.
- Credential helper functions require server-side callers to perform channel ownership authorization before use.
- Requests through `getFlipkartChannelConfig` and direct calls to `flipkartRequest` reject expired or soon-to-expire access tokens.
- The refresh protocol accepts only a server-generated Basic authorization header and never constructs or logs credentials in the refresh module.
- Refresh responses are expected to rotate the stored refresh token when Flipkart returns a new value.

## Not yet implemented

- Flipkart OAuth authorization routes and callback handling.
- Connecting the refresh protocol to persisted channel credentials and atomic credential rotation.
- Concurrent refresh coordination per channel.
- Provider-specific product/category/attribute mapping.
- Draft listing persistence and validation workflow.
- Live listing creation or update.
- Inventory/price synchronization.
- Idempotent publishing and reconciliation.
- Runtime provider verification with approved seller credentials.

## Verification limitations

The refresh protocol was implemented from the current official Flipkart Seller API documentation, which documents `grant_type=refresh_token`, Basic application authentication, returned `expires_in` and `refresh_token_expires_in`, and a 21-day refresh-token safe window for authorization-code flows.

The code was committed through GitHub repository operations. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session. No credentials or live merchant data were used.
