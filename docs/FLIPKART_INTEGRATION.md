# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + validated listing drafts + read-only client + token-refresh foundation
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

Dizito is implementing the third-party/partner model, so OAuth Authorization Code is the onboarding path. The current implementation intentionally stops at validated drafts and read-only listing operations. No live mutation endpoint is wired into Dizito yet.

## Implemented files

- `lib/platforms/flipkart/auth.ts` — third-party OAuth URL, signed user-bound state, authorization-code exchange, HTTPS callback enforcement, and bounded token exchange.
- `app/api/commerce/flipkart/connect/route.ts` — authenticated OAuth initiation.
- `app/api/commerce/flipkart/callback/route.ts` — authenticated callback, state validation, encrypted credential persistence, and channel activation.
- `lib/platforms/flipkart/client.ts` — environment-aware bearer client, timeout, expiry enforcement, automatic refresh, tenant checks, and read-only listing operations.
- `lib/platforms/flipkart/credentials.ts` — encrypted credentials and expiry persistence.
- `lib/platforms/flipkart/token-refresh.ts` — verified refresh-token grant implementation.
- `lib/platforms/flipkart/mapper.ts`
  - Validates canonical product/variant information before any provider mutation is attempted.
  - Requires at least one variant and a non-empty SKU for each variant.
  - Rejects duplicate SKUs within a draft.
  - Normalizes prices, inventory, images, and free-form attributes.
  - Produces an internal Flipkart mapping object rather than an invented Flipkart API payload.
- `lib/platforms/flipkart/draft.ts`
  - Requires an owned Flipkart channel.
  - Validates that mapped variants correspond to persisted listing variants.
  - Persists the mapping through the shared tenant-safe draft service.
  - Explicitly marks the draft `publishReady: false`.

## Required configuration

For third-party onboarding, configure:

- `FLIPKART_CLIENT_ID`
- `FLIPKART_CLIENT_SECRET`
- `FLIPKART_REDIRECT_URI` — registered HTTPS callback URL.
- `FLIPKART_ENVIRONMENT` — optional; defaults to `production`, and may be `sandbox`.
- `FLIPKART_TOKEN_ENCRYPTION_KEY`

The redirect URL must exactly match the HTTPS callback registered for the Flipkart third-party application.

## Credential and security notes

- Credentials are stored in `commerce_channel_credentials.access_token_encrypted`.
- OAuth state is short-lived, signed, HttpOnly, and bound to the authenticated Dizito user.
- Application credentials are used only server-side for authorization-code exchange and refresh.
- Requests reject expired or soon-to-expire access tokens.
- Refresh responses rotate the stored refresh token when Flipkart returns a new value.
- Draft creation validates channel ownership, product ownership, and variant ownership through the shared listing service.
- The current onboarding model uses a synthetic external account key (`flipkart`) per user because the verified authorization response does not provide a seller ID.

## Deliberately not implemented

- A fabricated Flipkart listing-creation request schema.
- Live listing creation or update.
- Inventory/price synchronization.
- Idempotent publishing and reconciliation.
- Provider-specific category/attribute mapping based on undocumented assumptions.
- Runtime provider verification with approved seller credentials.
- Multi-Flipkart-account support based on a verified external seller identifier.

## Verification limitations

The OAuth and refresh protocols were implemented from the current official Flipkart Seller API documentation. The public documentation verifies the Authorization Code flow and general listing capabilities, but the current public page does not expose enough stable listing-creation payload detail to safely invent a mutation contract.

The code was committed through GitHub repository operations. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session because repository cloning from the execution environment was blocked by DNS/network resolution. No credentials or live merchant data were used.
