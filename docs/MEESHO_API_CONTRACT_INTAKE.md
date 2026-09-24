# Meesho API Contract Intake Gate

## Purpose

This document is the implementation gate for the Meesho commerce adapter. It prevents provider behavior from being invented from seller-panel workflows or third-party integration descriptions.

## Current decision

No Meesho live client, connection route, publish route, or provider-specific database migration should be implemented until an authoritative Meesho API contract and authorized test access are available.

## Required evidence before provider code

- [ ] Official Meesho partner/supplier API onboarding confirmation.
- [ ] Authentication mechanism, credential names, signing rules, and token lifetime.
- [ ] Official base URL(s) and environment separation, including sandbox or test mode.
- [ ] Catalog/listing create and update endpoints, including whether draft state exists.
- [ ] Required catalog fields, category/attribute schema, image requirements, and validation errors.
- [ ] Price, inventory, SKU, and variant semantics.
- [ ] Order, cancellation, return, shipment, and label capabilities required for V1 scope.
- [ ] Idempotency/retry semantics and provider-side request correlation identifiers.
- [ ] Rate limits, pagination, timeout expectations, and error taxonomy.
- [ ] Webhook/event support or an approved polling/reconciliation strategy.
- [ ] Data retention and permitted storage requirements for seller/customer data.

## Implementation gates

### Gate 1 — Contract verification

Record each capability with an official source, date verified, environment, and confidence. Third-party descriptions may be tracked as leads only and must not be treated as implementation authority.

### Gate 2 — Provider-neutral design

Reuse existing tenant-scoped channel lookup, encrypted credential storage, listing state, and durable publish-attempt patterns only where their semantics match the verified Meesho contract. Do not assume Meesho supports WooCommerce-style drafts, synchronous publication, or provider idempotency.

### Gate 3 — Safe first implementation

The first code change may include pure validation/types/mappers and tests based only on verified fields. Network clients and authenticated routes require verified endpoint and authentication details. Live or destructive operations require explicit approval.

### Gate 4 — Reconciliation

If a provider request can end in an unknown state, the adapter must persist an attempt before the request and provide a deterministic reconciliation path based on an official provider identifier or an approved provider query. Blind retries are prohibited.

## Security requirements

- Every channel, listing, credential, publish attempt, and reconciliation query must be tenant-scoped.
- Verify channel ownership before retrieving or decrypting credentials.
- Never log access tokens, secrets, signed headers, or complete customer/order payloads.
- Validate external identifiers and bound response sizes before persisting provider data.
- Keep Meesho credentials separate from unrelated provider credentials and use explicit credential types.

## Verification record

- Repository inspection: completed through GitHub source access.
- Official Meesho API contract: not yet verified.
- Authorized Meesho test credentials: not available in this workstream.
- Local build, lint, type-check, automated tests, migrations, and provider calls: not run in this workstream.

## Next actionable input

Obtain official Meesho API/partner documentation or authorized test onboarding material. Once supplied, update this document with endpoint-level evidence and implement only the verified contract slice.
