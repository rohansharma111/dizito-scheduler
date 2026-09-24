# Flipkart Commerce Integration

## Status

- Phase: Read-only client foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled
- Database migration: Not added

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
  - Read-only listing lookup.
  - Read-only listing details lookup.
  - Listing search.
  - Channel provider/status checks.
  - Channel error metadata helper.
- `lib/platforms/flipkart/credentials.ts`
  - Encrypted credential payload storage using the existing provider-neutral credential table.
  - Access-token retrieval for server-side use.
  - Optional refresh-token and application credential fields stored inside the encrypted payload.

## Credential and security notes

- Credentials are stored in `commerce_channel_credentials.access_token_encrypted`.
- The credential payload is never returned by the client helper.
- The encryption key is read from `FLIPKART_TOKEN_ENCRYPTION_KEY`, with the existing `SHOPIFY_TOKEN_ENCRYPTION_KEY` accepted as a compatibility fallback.
- Production deployments should configure a dedicated Flipkart encryption key and should not rely on the fallback.
- Channel provider and active-status checks are required before requests are made.
- Tenant ownership must be enforced by the caller/service that resolves the channel for the authenticated user; the client itself does not accept arbitrary tenant identity as trusted input.

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

The files were committed through GitHub repository operations. Local build, lint, type-check, automated tests, migration execution, and live/sandbox provider requests have not been run in this session.
