# Meesho Commerce Integration Status

**Project:** Dizito — AI Commerce Operating System  
**Repository:** `rohansharma111/dizito-scheduler`  
**Branch:** `feature/commerce-meesho`  
**Last reviewed:** 2026-09-24  
**Status:** Discovery / verification in progress; implementation blocked on authoritative provider access

## Purpose

This document records the verified state, open questions, assumptions, blockers, and implementation boundaries for the Meesho commerce integration. It must be updated as provider access and API documentation are verified.

## Architectural boundary

Dizito's canonical data must remain provider-neutral:

```text
Canonical Product / Variant
        ↓
Commerce Channel / Connection
        ↓
Meesho Provider Adapter / Workflow
        ↓
Validate → Draft → Publish / Sync → Monitor → Reconcile
```

Meesho-specific requirements must remain inside the provider adapter, mapping, validation, and workflow layers. Do not add Meesho-specific fields to canonical Product or Variant records without a documented cross-provider requirement.

## Current repository findings

- Existing commerce foundations include channels, credentials, products, variants, media, listings, listing variants, and inventory-related structures.
- Existing provider directories include Amazon, Shopify, and WooCommerce.
- Existing project instructions require encrypted credentials, tenant ownership checks, provider-neutral canonical data, focused commits, and explicit verification before declaring production readiness.
- The repository uses raw SQL migrations through the existing migration runner.
- The current project roadmap identifies Meesho as a future provider expansion; this work is being developed on an isolated branch.
- The repository's package scripts include `build`, `lint`, `start`, `dev`, and `db:migrate`; no automated test script is declared in `package.json`.
- WooCommerce now has reusable publish-attempt and reconciliation patterns for durable state and network uncertainty, but these patterns have not been verified for Meesho and should only be reused through provider-neutral abstractions after contract verification.

## Meesho capability matrix

| Capability | Status | Evidence / next verification |
|---|---|---|
| Official seller/integration-partner program | Not verified for Dizito | Obtain current official onboarding/access documentation |
| Authentication method | Unknown | Verify from official partner documentation or issued credentials |
| Seller account identifier | Unknown | Confirm required identifiers and ownership semantics |
| Catalog/product creation | Unverified | Require official endpoint contract and access approval |
| Draft listing creation | Unverified | Confirm whether drafts exist as a provider-supported state |
| Category and attribute metadata | Unverified | Confirm official schema or seller-side requirements |
| Listing publication | Unverified | Confirm supported operation and authorization scope |
| Listing updates | Unverified | Confirm update semantics and external identifiers |
| Inventory synchronization | Unverified | Confirm endpoints, frequency limits, and source-of-truth rules |
| Price synchronization | Unverified | Confirm endpoints and currency/rounding requirements |
| Listing status retrieval | Unverified | Confirm status values and eventual-consistency behavior |
| Orders | Unverified | Confirm scope separately from catalog/listing integration |
| Shipping/returns | Unverified | Confirm scope separately from orders |
| Idempotency contract | Unknown | Verify provider support; otherwise use safe local attempt/reconciliation controls |
| Sandbox/test environment | Unknown | Confirm availability before any live write testing |
| Rate limits/retry guidance | Unknown | Obtain official limits and error semantics |

## Evidence classification

### Official or seller-facing information

Meesho's seller-facing materials describe Supplier Panel workflows such as catalog upload, category selection, product information, images, pricing, GST percentage, HSN code, weight, and bulk upload. These materials establish seller workflow context but do not, by themselves, establish an authorized programmatic API contract for Dizito.

### Third-party or indirect information

Third-party API indexes and independent profiles describe a partner-gated supplier/order-management API and possible catalog, inventory, order, shipping, and returns capabilities. These sources are leads only. They are not treated as authoritative proof of current Meesho access, endpoint availability, authentication, permissions, or contractual authorization.

A public Postman workspace under the Meesho name also exists, but its presence alone does not prove that a specific collection is a complete, current, authorized seller API contract for this project.

## Current blockers

1. Obtain authoritative Meesho seller/integration-partner access information.
2. Verify the authentication mechanism and required credential fields.
3. Verify which catalog/listing operations are available to the intended account type.
4. Confirm whether a sandbox, test seller account, or controlled test process exists.
5. Confirm whether the provider permits the intended Dizito use case and data handling.

## Planned implementation gates

### Gate 1 — Access and contract

Do not implement live Meesho API calls until the authentication flow, base URL, endpoint contracts, permission requirements, and provider terms are verified.

### Gate 2 — Provider-neutral mapping

Inspect and reuse existing canonical product, variant, media, channel, listing, and credential abstractions. Implement only mappings supported by verified provider requirements.

### Gate 3 — Draft preparation

If Meesho supports a programmatic draft or validation workflow, implement local draft preparation first. Do not claim that local draft preparation equals a Meesho-side draft listing.

### Gate 4 — Publishing and reconciliation

Implement live publishing only after explicit approval and controlled verification. Require tenant checks, durable attempt state, safe handling of network uncertainty, idempotency or deterministic external mapping, and reconciliation where supported.

## Security requirements

- Never commit access tokens, refresh tokens, API secrets, or merchant data.
- Store provider credentials only through approved encrypted storage patterns.
- Enforce authenticated tenant ownership on all connection, draft, publish, status, and reconciliation mutations.
- Do not expose secrets in API responses, logs, or error messages.
- Do not use fabricated merchant IDs, listing IDs, provider responses, or fake verification results.
- Do not execute live or destructive provider operations without explicit approval.

## Verification ledger

| Date | Check | Result |
|---|---|---|
| 2026-09-24 | Repository instructions and project status reviewed | Completed through GitHub source inspection |
| 2026-09-24 | Provider directory audit | Amazon, Shopify, and WooCommerce directories confirmed; WooCommerce contains client, credentials, draft, mapper, publish, and reconciliation modules |
| 2026-09-24 | Package script audit | `build`, `lint`, `start`, `dev`, and `db:migrate` present; no automated test script declared |
| 2026-09-24 | Meesho public/seller API discovery | Partner-gated API lead identified; official Dizito access not verified |
| 2026-09-24 | Meesho live authentication or provider request | Not performed |
| 2026-09-24 | Meesho publishing | Not performed |
| 2026-09-24 | Local build/lint/type-check/tests | Not run in this environment |

## Next actions

1. Obtain or request authoritative Meesho API onboarding documentation/access.
2. Inspect the exact shared channel, credential, listing, and publish-attempt schema before proposing any migration.
3. Define a provider-neutral adapter contract only after Meesho's supported operations and authentication are verified.
4. Add local validation/draft preparation before any live provider write.
5. Implement controlled publishing, idempotency, and reconciliation only after explicit approval and test access.
6. Update this document with exact verified endpoint and authentication details once available.
