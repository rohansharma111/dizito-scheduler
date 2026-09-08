# Shopify integration foundation

This phase adds the first commerce-channel provider foundation for Shopify.

## Architecture

`Canonical Product/Variant -> Listing -> Commerce Channel -> Shopify GraphQL Admin API`

Shopify credentials are intentionally not stored in `commerce_channels.metadata`. They are encrypted application-side and stored in `commerce_channel_credentials`.

## Environment

Required:

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_TOKEN_ENCRYPTION_KEY` — 32-byte key, supplied as either 64 hex characters or base64
- `SHOPIFY_APP_URL` (recommended) or existing `NEXTAUTH_URL`

Optional:

- `SHOPIFY_API_VERSION` — defaults to `2026-07`
- `SHOPIFY_SCOPES` — defaults to `read_products,write_products`

The configured Shopify app redirect URI must be:

`<SHOPIFY_APP_URL>/api/commerce/shopify/callback`

## OAuth flow

1. An authenticated Dizito user opens `/commerce/channels` and enters a `*.myshopify.com` domain.
2. Dizito creates a short-lived signed OAuth state and an HttpOnly state cookie.
3. Shopify authorization is started using the standalone authorization-code grant.
4. The callback validates state and exchanges the authorization code for an expiring offline access token (`expiring=1`).
5. The resulting access token and refresh token are encrypted and persisted separately from channel metadata.
6. The Shopify client refreshes expiring offline tokens server-side and persists the rotated token pair.

## API client

`lib/platforms/shopify/client.ts` is intentionally built on `fetch` and the Shopify GraphQL Admin API rather than adding a provider SDK dependency. API versioning is explicit and configurable.

The current default is `2026-07`. Shopify documents `2026-07` as a supported stable version; update the environment value as part of the normal quarterly API-version maintenance cycle.

## Database

`db/migrations/002_shopify_channel_credentials.sql` adds the credential table. The migration is not automatically applied by application startup and has not been applied to production merely by being committed.

Run the existing migration procedure only after reviewing the migration and confirming the target database.

## Next implementation step

The next Shopify phase is the provider listing adapter:

- map a Dizito product/variant to Shopify product/variant IDs
- create/update Shopify products through GraphQL
- persist `product_listings` and `product_listing_variants` sync state
- publish through the existing listing/channel abstraction

The scheduler architecture remains unchanged.
