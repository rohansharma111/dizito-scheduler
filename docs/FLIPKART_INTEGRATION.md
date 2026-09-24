# Flipkart Commerce Integration

## Status

- Phase: Read-only client foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled
- Database migration: No new Flipkart-specific migration required

## Verified provider capabilities

The official Flipkart Seller API v3 documentation describes:

- OAuth client-credentials flow for self-access applications.
- OAuth authorization-code flow for third-party applications.
- Bearer-token authenticated Seller APIs.
- Listing retrieval by SKU.
- Listing details retrieval by SKU.
- Listing search with listing-status filters and pagination.
- Listing creation, listing updates, price updates, inventory updates, and activation/deactivation.

The implementation in this phase intentionally exposes only read-only listing operations. No live mutation endpoint is wired into Dizito yet.

## Implemented files

- `lib/platforms/flipkart/client.ts`
  - Environment-aware production/sandbox base URL selection.
  - Bearer-token request wrapper.
  - Bounded 15-second timeout when the caller does not provide an abort signal.
  - Explicit timeout error handling without exposing response bodies or credentials.
  - Read-only listing lookup.
  - Read-only listing details lookup.
  - Listing search.
  - Tenant-scoped channel provider/status checks.
  - Channel error metadata helper.
- `lib/platforms/flipkart/credentials.ts`
  - Encrypted credential payload storage using the existing provider-neutral credential table.
  - Access-token retrieval for server-side use.
  - Optional refresh-token and application credential fields stored inside the encrypted payload.

## Credential and security notes

- Credentials are stored in `commerce_channel_credentials.access_token_encrypted`.
- The existing provider-neutral table is created by `db/migrations/002_shopify_channel_credentials.sql`; its schema is not Shopify-exclusive.
- The credential payload is never returned by the client helper.
- The encryption key is read only from `FLIPKART_TOKEN_ENCRYPTION_KEY`.
- Channel provider, active-status, and authenticated-user ownership checks are required before requests are made through `getFlipkartChannelConfig`.
- Credential helper functions require server-side callers to perform channel ownership authorization before use.

## Not yet implemented

- Flipkart OAuth authorization routes and callback handling.
- Access-token refresh and expiry-aware rotation.
- Provider-specific product/category/attribute mapping.
- Draft listing persistence and validation workflow.
- Live listing creation or update.
- Inventory/price synchronization.
- Idempotent publishing and reconciliation.
- Runtime provider verification with approved seller credentials.

## Verification limitations

The files were committed through GitHub repository operations. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session. The validation workflow is configured in `.github/workflows/validate.yml`, but no successful status check is available for the latest implementation commit through the current GitHub integration.
