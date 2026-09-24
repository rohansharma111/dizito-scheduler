# Meesho Provider Architecture Audit

**Repository:** `rohansharma111/dizito-scheduler`  
**Branch:** `feature/commerce-meesho`  
**Reviewed:** 2026-09-24  
**Status:** Discovery / architecture review only

## Scope

This audit identifies reusable patterns for a future Meesho adapter without implementing or assuming any Meesho API behavior.

## Reusable repository patterns

- Tenant-scoped channel lookup through the existing commerce channel service.
- Provider-neutral `product_listings` records linked to a commerce channel.
- Existing encrypted credential storage pattern under `commerce_channel_credentials`.
- Durable publish-attempt tracking through `commerce_publish_attempts`.
- Listing synchronization state fields such as `status`, `sync_status`, `external_id`, `last_error`, and `last_synced_at`.
- Explicit live-publish confirmation and idempotency-key handling in the existing WooCommerce publish workflow.
- Reconciliation as a separate concern for uncertain provider outcomes.

## Important architectural observations

1. The WooCommerce publish workflow performs tenant-scoped channel and listing checks before provider access. A Meesho workflow should preserve this boundary.
2. The existing publish-attempt abstraction supports `started`, `succeeded`, `failed`, and `ambiguous` outcomes. This is potentially reusable, but the exact lifecycle must be reviewed against the verified Meesho API semantics before adoption.
3. Network uncertainty is treated differently from confirmed provider failure. A future Meesho adapter should not blindly retry uncertain writes unless the provider offers idempotency or a deterministic reconciliation mechanism.
4. The provider adapter must not assume that Meesho supports the same publication model as WooCommerce. In particular, local draft preparation, provider-side draft state, catalog approval, and publication may be distinct or unavailable operations.
5. No Meesho-specific fields should be added to canonical product or variant tables solely based on seller-panel screens or third-party API descriptions.

## Not yet verified

- Meesho authentication and credential fields.
- Official base URL and endpoint contracts.
- Catalog, listing, inventory, price, order, shipping, and return permissions.
- Provider-side draft or validation support.
- Idempotency guarantees and reconciliation identifiers.
- Sandbox or controlled test environment.
- Rate limits, error taxonomy, and eventual-consistency behavior.

## Implementation gate

The first Meesho code change should be limited to verified contract elements, likely beginning with a provider-neutral type boundary and local validation/mapping tests. Live client methods, connection routes, publishing routes, and migrations must wait until official access documentation and test authorization are available.

## Verification record

- Repository inspection performed through GitHub source access.
- No local build, lint, type-check, migration execution, automated test suite, Meesho authentication, or provider write was run in this environment.
