# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + read-only client + token-refresh foundation
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
- A 21-day safe window in the authorization-code flow for proactive refresh-token renewal.
- Listing retrieval by SKU.
- Listing details retrieval by SKU.
- Listing search with listing-status filters and pagination.
- Listing creation, listing updates, price updates, inventory updates, and activation/deactivation.

Dizito is implementing the third-party/partner model, so OAuth Authorization Code is the onboarding path. The implementation intentionally exposes only read-only listing operations after connection. No live mutation endpoint is wired into Dizito yet.

## Implemented files

- `lib/platforms/flipkart/auth.ts`
  - Builds the verified third-party authorization URL.
  - Uses `Seller_Api` scope and Authorization Code response type.
  - Requires an HTTPS callback URL.
  - Signs short-lived OAuth state with the Flipkart client secret.
  - Binds OAuth state to the authenticated Dizito user ID.
  - Exchanges authorization codes using the documented Basic-authenticated token endpoint.
  - Uses a bounded 15-second token-exchange timeout.
  - Strictly validates access/refresh tokens and expiry values.
- `app/api/commerce/flipkart/connect/route.ts`
  - Requires an authenticated Dizito session.
  - Creates a signed, user-bound OAuth state.
  - Stores the state in an HttpOnly, SameSite cookie.
  - Redirects the seller to Flipkart authorization.
- `app/api/commerce/flipkart/callback/route.ts`
  - Requires an authenticated Dizito session.
  - Validates both the OAuth state cookie and signed user-bound state.
  - Exchanges the authorization code server-side.
  - Creates or reuses the user's Flipkart commerce channel.
  - Persists encrypted credentials and token expiries.
  - Activates the channel only after credential persistence succeeds.
  - Clears the OAuth state cookie after successful completion.
- `lib/platforms/flipkart/client.ts`
  - Environment-aware production/sandbox base URL selection.
  - Bearer-token request wrapper.
  - Bounded 15-second timeout when the caller does not provide an abort signal.
  - Expiry-aware channel configuration checks with a 60-second safety skew.
  - Automatic access-token refresh when the stored token reaches the 60-second safety window.
  - Tenant-scoped, advisory-lock-protected credential rotation.
  - Read-only listing lookup, details lookup, and search.
  - Tenant-scoped channel provider/status checks.
- `lib/platforms/flipkart/credentials.ts`
  - Encrypted credential payload storage using the existing provider-neutral credential table.
  - Access-token retrieval for server-side use.
  - Refresh-token and application credentials stored inside the encrypted payload.
  - Access-token and refresh-token expiry persistence.
- `lib/platforms/flipkart/token-refresh.ts`
  - Verified Flipkart `refresh_token` grant request.
  - Basic-authenticated token endpoint request.
  - Bounded 15-second timeout.
  - Strict validation of returned token and expiry values.

## Required configuration

For third-party onboarding, configure:

- `FLIPKART_CLIENT_ID` — Flipkart third-party application ID.
- `FLIPKART_CLIENT_SECRET` — Flipkart third-party application secret.
- `FLIPKART_REDIRECT_URI` — registered HTTPS callback URL. If omitted, Dizito derives it from `NEXTAUTH_URL` and requires that URL to be HTTPS.
- `FLIPKART_ENVIRONMENT` — optional; defaults to `production`, and may be `sandbox`.
- `FLIPKART_TOKEN_ENCRYPTION_KEY` — existing 32-byte credential encryption key.

The redirect URL must exactly match the HTTPS callback registered for the Flipkart third-party application.

## Credential and security notes

- Credentials are stored in `commerce_channel_credentials.access_token_encrypted`.
- The existing provider-neutral table is created by `db/migrations/002_shopify_channel_credentials.sql`; its schema is not Shopify-exclusive.
- OAuth state is short-lived, signed, stored HttpOnly, and bound to the authenticated Dizito user.
- Application credentials are used only server-side for authorization-code exchange and refresh.
- Requests reject expired or soon-to-expire access tokens.
- Refresh responses rotate the stored refresh token when Flipkart returns a new value.
- The current onboarding model uses a single synthetic external account key (`flipkart`) per user because the verified authorization response does not provide a seller ID. Multi-account support should be added only after a verified seller-account identifier is available from Flipkart.

## Not yet implemented

- Provider-specific product/category/attribute mapping.
- Draft listing persistence and validation workflow.
- Live listing creation or update.
- Inventory/price synchronization.
- Idempotent publishing and reconciliation.
- Runtime provider verification with approved seller credentials.
- Multi-Flipkart-account support based on a verified external seller identifier.

## Verification limitations

The OAuth and refresh protocols were implemented from the current official Flipkart Seller API documentation, including the third-party authorization URL, HTTPS redirect requirement, `Seller_Api` scope, authorization-code exchange, Basic authentication, returned `expires_in` and `refresh_token_expires_in`, and the refresh-token safe-window behavior.

The code was committed through GitHub repository operations. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session because repository cloning from the execution environment was blocked by DNS/network resolution. GitHub did not report a workflow run for the inspected commit. No credentials or live merchant data were used.
