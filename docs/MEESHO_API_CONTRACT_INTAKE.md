# Meesho API Contract Intake Gate

## Purpose

This document is the implementation gate for the Meesho commerce adapter. It prevents provider behavior from being invented from seller-panel workflows or third-party integration descriptions.

## Current decision

No Meesho live client, connection route, publish route, or provider-specific database migration should be implemented until an authoritative Meesho API contract and authorized test access are available.

## Current discovery update — official-source verification (2026-10-05)

A fresh review of Meesho's public official web properties did not locate a public seller API specification, developer portal, authenticated seller API reference, sandbox documentation, or endpoint-level catalog/listing contract suitable for implementation.

Meesho's official public seller material confirms that suppliers use a seller/supplier panel to list products and manage orders and inventory. That establishes seller-facing product and operational workflows, but it does **not** establish a programmatic API contract for Dizito.

Meesho's current public corporate material also describes technology integrations with logistics partners. This demonstrates that Meesho supports partner technology integrations in some contexts, but it does **not** establish that a public seller-commerce API is available to Dizito or that logistics-partner interfaces can be reused for catalog/listing operations.

Therefore the integration remains contract-gated. No endpoint, authentication scheme, token type, payload, identifier, webhook, or publication capability is being inferred from these public materials.

## Current discovery update — partner-mediated integration lead

A third-party Fynd Konnect documentation page describes a Meesho integration onboarding flow involving:

- A seller/location-specific external identifier.
- An onboarding request sent to a Meesho integration contact.
- Meesho-issued refresh tokens associated with selling locations.
- Seller activation events delivered through a partner webhook.
- Partner-side validation of the seller and location identifiers.

This is recorded as a **third-party integration lead only**. It does not establish that Dizito can use the same flow, that the same credentials or endpoints are available to Dizito, or that the process is a general public Meesho API. No implementation should be based on this description without direct authorization and documentation from Meesho or an authorized integration partner.

Reference lead: Fynd Konnect Meesho registration and API credential onboarding documentation, reviewed on 2026-09-24.

## Required evidence before provider code

- [ ] Official Meesho partner/supplier API onboarding confirmation for Dizito or its authorized integration partner.
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
- [ ] Confirmation whether Dizito integrates directly with Meesho or through a partner-mediated channel such as a supported connector.
- [ ] Confirmation of whether credentials are tenant-level, seller-level, location-level, or partner-account-level.

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
- Do not treat a refresh token or location identifier described by a third-party connector as portable to Dizito without explicit authorization.

## Verification record

- Repository inspection: completed through GitHub source access.
- Official Meesho public-source review: completed 2026-10-05; no public seller API contract sufficient for implementation was located.
- Official seller workflow: confirmed at the public seller-facing level only; not treated as an API contract.
- Partner-mediated integration lead: identified, but not authorized for Dizito.
- Authorized Meesho test credentials: not available in this workstream.
- Local build, lint, type-check, automated tests, migrations, and provider calls: not run in this workstream.

## Next actionable input

Obtain official Meesho API/partner documentation or authorized test onboarding material. Specifically clarify whether Dizito should pursue direct Meesho integration or an authorized partner-mediated connector. Once supplied, update this document with endpoint-level evidence and implement only the verified contract slice.
