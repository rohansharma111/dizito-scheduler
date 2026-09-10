# DIZITO — CODEX PROJECT CONTEXT

**Project:** Dizito — AI Commerce Operating System
**Repository:** `rohansharma111/dizito-scheduler`
**Handover basis:** Master Project Status & Technical Handover dated 10 September 2026 plus Payment & Refund Production Audit dated 8 September 2026.
**Current documented main merge:** PR #27, commit `3aa0ec48e6682605cd1683a7ee827320e2abb7b7`.
**Current phase:** Amazon Commerce Integration / transition toward Product Catalog + Listing/Channel architecture.

## 1. Project identity and vision

Dizito is an existing commerce and social publishing platform evolving toward an AI Commerce Operating System. It is NOT a greenfield project.

The core strategic idea is to maintain one clean, merchant-owned, provider-neutral canonical catalog inside Dizito and connect it to external commerce channels through reusable provider adapters.

Long-term flow:

`Canonical Product → Select Commerce Channel → Provider-specific workflow → Validate → Publish/Sync → Monitor`

The core model must remain provider-neutral. Amazon, Shopify, and future providers are channels, not the canonical source of product truth.

Long-term capabilities may include catalog enrichment, bulk operations, listings, inventory synchronization, orders, fulfillment, payments, refunds, returns, analytics, automation and AI-assisted commerce workflows. These are roadmap concepts, not permission to implement them opportunistically.

## 2. Existing application

Dizito already contains a Next.js App Router application, protected dashboard, catalog, inventory, orders, media, billing, social integrations and scheduler.

The existing scheduler architecture is intentionally unchanged during the current commerce work.

Earlier project work established that repository/database/deployment truth is authoritative and completed architecture must not be restarted without evidence.

## 3. Architecture

Established commerce boundary:

`Canonical Product/Variant → Listing → Commerce Channel/Connection → Provider Adapter/API`

Canonical product data remains provider-neutral.

Provider-specific requirements are translated at runtime by provider workflows/adapters.

The provider adapter constructs provider-shaped payloads. The canonical database model must not become Amazon-specific merely because Amazon requires fields that Dizito does not need canonically.

## 4. Canonical domain concepts

### Product
Merchant-owned canonical product.

### Product Variant
Sellable/configurable product variant carrying SKU and commercial attributes such as price.

### Product Media
Canonical relationship between products and media assets.

### Media Library
Canonical media source, backed by Cloudinary.

### Commerce Channel
A connected external commerce destination/provider account.

### Listing
Provider-specific representation of a Dizito product/variant on a channel.

### Listing Variant
Variant-level mapping between Dizito and a channel.

### External Identifier
Provider/catalog identity assigned or explicitly supplied for a product.

Do not collapse these concepts into a provider-specific product model.

## 5. Current providers

### Shopify
Shopify was the first commerce provider and is considered closed/working.

Existing work includes listing/sync, media mapping, variant reconciliation and status/sync fixes.

Existing documentation: `docs/shopify-integration.md`.

Do not redesign Shopify while working on the Amazon phase unless a concrete dependency requires it.

### Amazon India
Amazon India through Seller Central / Selling Partner API (SP-API) is the second commerce provider.

Marketplace: `A21TJRUUN4KGV`
SP-API endpoint: `https://sellingpartnerapi-eu.amazon.com`
LWA endpoint: `https://api.amazon.com/auth/o2/token`
Seller Central: `https://sellercentral.amazon.in`

Current authentication is LWA OAuth 2.0. The current integration does NOT require a new IAM/SigV4 dependency.

## 6. Current Amazon product workflow

Current product-content workflow:

1. Discover Amazon Product Type.
2. Retrieve Product Type Definition.
3. Fetch linked JSON Schema resource where required.
4. Choose seller-friendly product identity.
5. Complete Amazon-specific product facts.
6. Evaluate conditional requirements against the current draft.
7. Construct a safe product-only draft.
8. Call Listings Items `VALIDATION_PREVIEW`.
9. Display Amazon issues/results.

No production live-listing workflow has been completed.

Current product mode is `LISTING_PRODUCT_ONLY`.

`LISTING_OFFER_ONLY` is deliberately reserved for the future offer layer.

## 7. Amazon schema architecture

Amazon Product Type Definitions JSON Schema is the machine-readable source of truth for attributes, types, constraints, required fields and conditional rules.

Product-type discovery evolved from exact item-name lookup to fallbacks including keyword and marketplace/locale-oriented/all-types discovery because exact name lookup could fail.

Product Type Definition responses can provide the actual schema through `schema.link.resource`; the implementation fetches that linked schema document.

Schema links are temporary (approximately seven days according to the project documentation), so stale schema assumptions must not be treated as permanent truth.

Amazon validation remains the final authority even when Dizito performs local schema evaluation.

## 8. Conditional requirements

Earlier implementations broadly exposed conditional branches and over-exposed fields.

The current implementation evaluates conditional requirements against the current draft so values entered by the seller can activate additional requirements.

Do NOT treat every conditional branch as universally required.

Important future regression coverage:
- if/then/else
- allOf
- anyOf
- oneOf
- nested objects/arrays
- branches that activate
- branches that should remain inactive

## 9. Seller-friendly Amazon identity

Raw identity controls evolved into a guided seller workflow.

Supported concepts include:
- explicit real typed external product identifier
- explicit existing Amazon ASIN
- supported/approved GTIN exemption path

Rules:
- never infer Amazon identity from SKU
- never infer identity merely from a Dizito barcode
- never infer `merchant_suggested_asin`
- never fabricate ASINs
- require explicit identifier type/value
- validate format/checksum where applicable

Historical Amazon error 90188 demonstrated the risk of invalid external product identifiers.

## 10. Product vs offer boundary

This is a critical architectural boundary.

### Product content
Product facts and product-type-specific Amazon information.

Current mode: `LISTING_PRODUCT_ONLY`.

### Offer
Operational/commercial data such as:
- price
- condition
- fulfillment
- inventory

Future mode: `LISTING_OFFER_ONLY`.

Historical Amazon error 90248 showed that `fulfillment_availability` was inappropriate in the product-only preview. Keep operational offer fields out of the current product-content editor and payload.

Future flow:

`Dizito Variant + Inventory → Amazon Offer (price + condition + fulfillment + inventory)`

The future offer layer must consume canonical Variant/Inventory data separately so operational fields cannot leak into product content.

## 11. Commerce database foundation

Known key tables:

`products` — canonical product.

`product_variants` — sellable variants, including SKU and commercial attributes; SKU is globally unique.

`product_media` — product-to-media links, ordering and primary flag.

`media_library` — canonical Cloudinary-backed media.

`commerce_channels` — provider/channel connections.

`product_listings` — provider-specific listing state, including status, sync state, external ID, provider metadata and timestamps.

`product_listing_variants` — variant-level listing mapping.

`commerce_channel_credentials` — encrypted/provider credential foundation.

`product_listing_media` — persistent provider media mapping.

`amazon_channel_credentials` — Amazon refresh-token/expiry/scope credential storage.

Commerce migration history includes the provider-neutral listing/channel foundation followed by Shopify and Amazon credential/media work.

Use raw SQL migrations and the existing migration runner. Do not duplicate domain tables without evidence.

Tenant ownership must be preserved on all commerce operations. Do not introduce cross-tenant access.

## 12. Known important files

### Amazon
`lib/platforms/amazon/client.ts` — Amazon API client, LWA access, product-type/definition operations, discovery fallbacks and requirement modes.

`lib/platforms/amazon/schema.ts` — schema representation, summaries and conditional requirement logic.

`lib/platforms/amazon/identity.ts` — identifier normalization/validation and explicit ASIN handling.

`lib/platforms/amazon/listings.ts` — Amazon draft construction, validation preview and publish adapter functions; product-only safe payload path.

`app/api/commerce/amazon/product-types/route.ts` — product-type discovery API.

`app/api/commerce/amazon/product-type-definition/route.ts` — definition/schema API, defaulting to product-only.

`app/api/commerce/amazon/listing-preview/route.ts` — server validation-preview endpoint using `LISTING_PRODUCT_ONLY`.

`components/products/ProductAmazonListing.tsx` — seller-facing Amazon workflow: identity, schema fields, conditional issues and preview.

### Canonical catalog
`lib/commerce/products/service.ts` — canonical Product CRUD/details.

`lib/commerce/products/variants.ts` — Variant/SKU/barcode/price operations.

`lib/commerce/products/media.ts` — product-media relationship operations.

### Database
`scripts/migrate.mjs` — raw SQL migration runner using ordered migrations, schema migration tracking and advisory locking.

`db/migrations/*.sql` — database schema evolution.

### Scheduler
`.github/workflows/dizito-scheduler.yml` — existing five-minute publish trigger; intentionally unchanged during current commerce work.

This file list is not a substitute for repository inspection. Codex must inspect the actual tree.

## 13. Technology stack

Current project technology includes:
- Next.js App Router
- TypeScript
- React
- PostgreSQL
- NextAuth
- Amazon SP-API / LWA
- Razorpay
- OpenAI SDK
- Cloudinary
- node-cron
- Tailwind CSS
- GitHub workflow scheduling

The installed package versions and repository code are authoritative.

Before framework-level changes, inspect the installed Next.js documentation under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## 14. Implementation history and lessons

### Product details runtime issue
SQL lacked a `product_media_id` alias. Fixed by adding `pm.id AS product_media_id` while preserving `pm.id`.

### Shopify listing status
Status condition/SQL typing was inspected; explicit casts/status handling resolved it.

### Shopify sync stuck
Failure could occur before catch/finalization; try/catch was moved immediately after claim.

### Amazon verification
Initial verification appeared to ask for AWS credentials. Investigation established LWA-only for the current path; IAM/SigV4 dependency was removed. PR #12 resolved the issue.

### Amazon UI `[object Object]`
Structured responses were rendered directly. Typed/formatted API boundary data resolved it. PR #13.

### Product-type discovery
Exact name alone was insufficient. Keyword and all-types fallback logic was added. PRs #15/#16.

### Schema retrieval
Definition response returned a schema resource link rather than an embedded schema. Fetching the linked schema resolved it.

### COFFEE returned 22 issues
Amazon exposed many product-type-specific requirements including manufacturer/importer data, identity, packaging units, bullets, temperature, liquid contents, vegetarian status and country of origin. The architectural response was schema-aware editing rather than hardcoding Amazon fields into the canonical Product.

### Six issues appeared after data entry
Conditional requirements activated after values changed. Conditional evaluation against the current draft was introduced.

### 90248 fulfillment_availability
Operational quantity was rejected in product preview. Product-only mode and explicit product/offer separation resolved the architectural problem.

### 90188 external identifier
Identifier type/value was invalid. Explicit typed identity and validation with no inference hardened the payload path.

The major debugging lesson is that many failures were architecture-boundary problems rather than isolated coding bugs. Amazon-specific requirements, identity rules and operational offer fields belong at the provider boundary rather than in the canonical Product.

## 15. Important current decisions

1. Product remains canonical/provider-neutral.
2. Product → Listing → Channel → Provider adapter is the reusable commerce architecture.
3. Raw SQL migrations remain the database convention.
4. Amazon India via SP-API is the second commerce provider.
5. Current Amazon authentication is LWA-only.
6. Current product workflow uses product-only requirements.
7. Seller-friendly identity is preferred over raw identity controls.
8. Amazon schema is the machine source of truth.
9. Amazon validation is the final authority.
10. Production live publishing is not yet complete.
11. SKU/barcode identity inference is prohibited.
12. PR merges require explicit user authorization.

## 16. Current status — confirmed complete

- Products, Variants, Product Media and Inventory relationships.
- Shopify commerce foundation considered closed/working.
- Amazon India connection and channel verification.
- LWA-based Amazon authentication.
- Amazon product-type discovery with fallbacks.
- Amazon definition/schema retrieval.
- Schema-aware product requirements/editor.
- Seller-friendly identity workflow.
- Typed external identifier and explicit ASIN handling.
- Product-only validation preview.
- Offer/fulfillment fields excluded from current product workflow.
- Conditional schema evaluation.
- PR #27 merged into main.

Recent Amazon commits include work for conditional requirements, seller identity, catalog search helpers/API/UI and matching.

## 17. Current in-progress / next work

### Critical
- Amazon catalog matching / existing-ASIN discovery.
- Separate Amazon offer layer.

### High
- Conditional-schema regression fixtures.
- Unit tests for identity and payload builder.
- Multiple representative Amazon product types.

### Medium
- Improve seller-facing field grouping.
- Add local schema validation before Amazon calls where practical.
- Decide durable listing/mapping persistence.

### Future
- Production live listing.
- Update/retry/idempotency/reconciliation.
- Broader commerce providers/marketplaces.

## 18. Catalog-first Amazon matching

Immediate next architectural direction is catalog-first matching / existing-ASIN discovery.

Before treating a Dizito product as a new Amazon product, determine whether it already exists in Amazon's catalog.

Prefer real product identity when available.

Do not change the canonical Product model merely to support matching.

Open UX decision: identifier-first, title/brand search, or combined.

Open persistence decision: how a confirmed catalog match versus a new-product path is represented in `product_listings`.

The no-match/new-product path must remain intact:

`Product Type → product-only schema → identity → Amazon-specific facts → conditional evaluation → validation preview`

## 19. Future Amazon offer layer

Offer data should be derived from canonical Variant and Inventory data.

Expected operational attributes include price, condition, fulfillment and inventory.

Keep `fulfillment_availability` and equivalent operational fields out of product-content mode.

Open question: which offer attributes should be persisted versus dynamically derived.

## 20. Persistence and live publishing

Current validation preview intentionally avoids final production persistence.

Before enabling live publishing, define durable persistence for:
- product listings
- listing variants
- provider external identifiers
- listing state
- offer state
- synchronization state
- errors
- retry state
- idempotency
- reconciliation

Production publishing should only be enabled after matching, product validation, offer completeness, identity safety and durable state are proven.

## 21. Testing status

Confirmed:
- Amazon OAuth connection/callback exercised.
- Channel became Active after credential migration correction.
- LWA verification succeeded.
- Product-type discovery returned actual types with fallback logic.
- Schema resource was fetched and real required fields became visible.
- Coffee validation returned real Amazon issues.
- Structured array/object editor and metadata handling implemented.
- Seller identity UI and format checks implemented.
- User reported `npm run build` passed for recent Amazon PRs including PR #26 and PR #27.
- PR #27 merged after build verification.

Not yet verified:
- multiple representative Amazon product types
- conditional branches that activate and remain inactive
- complex anyOf/oneOf/allOf combinations
- multiple-variant Amazon behavior
- valid and invalid EAN/UPC/GTIN/ISBN cases for Amazon India
- existing-ASIN/catalog matching
- future offer/fulfillment mapping
- end-to-end live publish/update/retry/idempotency/reconciliation

## 22. Known risks

### Dynamic Amazon schemas
Different product types and changing schemas can alter UI behavior. Mitigate with schema-driven design, broader tests and Amazon validation.

### Complex JSON Schema
Local evaluation may miss edge cases. Keep Amazon validation authoritative and add fixtures.

### Identifier validity
Invalid values cause submission failures. Use explicit type/value plus format/checksum validation.

### Product/offer leakage
Operational fields could leak into product payloads. Preserve product-only mode and explicit hidden operational fields.

### Temporary schema resources
Cached schemas may become stale. Fetch current definition/schema when loading.

### Live publishing
Unverified writes could create inconsistent state. Defer until offer, persistence, idempotency and reconciliation are ready.

### Validation Preview limits
Avoid unnecessary preview calls and add local validation where practical.

## 23. Payment / Refund Production Audit — intentionally deferred

A separate audit dated 8 September 2026 covers production hardening of the payment/refund subsystem.

IMPORTANT: the audit explicitly says the core return/refund flow has passed the current critical end-to-end retry validation. The audit is deferred production hardening, not evidence that core refund functionality is unfinished.

### Validated scenario — PASS
- Payment capture and attempt tracking
- Shipment and inventory allocation
- Return lifecycle
- Refund creation
- Failed refund preserved
- Retry with a new idempotency key
- Successful provider refund
- Payment refund-state synchronization
- Return linked to successful refund
- Completion gated on successful refund
- Inventory restock and movement audit

Latest clean retry scenario:
- Order #32
- Payment #19
- Return #6
- Refund #19 = failed attempt
- Refund #20 = successful retry

Observed:
- Refund #19 remained failed and was not linked to the return.
- Refund #20 used a new idempotency key.
- Refund #20 succeeded at Razorpay.
- Refund #20 became linked to Return #6.
- Payment #19 became refunded.
- Return #6 completed.
- One inventory unit was restocked.
- Inventory movements showed shipment OUT -1 followed by return IN +1.

These are historical validated test results, NOT production certification.

### Deferred production-hardening checklist

A. Webhook edge cases:
- duplicate delivery
- out-of-order delivery
- missing/unknown local identifiers
- late `payment.failed` after capture
- repeated `refund.processed`
- repeated `refund.failed`

B. Ambiguous provider failures:
- test Razorpay timeout/network ambiguity where provider may have accepted refund
- recover through reconciliation rather than blind retry

C. Reconciliation:
- compare local pending/processing refunds against provider state
- converge local records safely
- prevent duplicate refunds

D. Idempotency/concurrency:
- concurrent refund requests
- duplicate API submissions
- repeated webhook events
- simultaneous return/refund requests
- verify constraints and row locks

E. Authorization/security:
- ownership checks
- authenticated access
- webhook signature verification
- secret handling
- provider identifiers
- error exposure
- administrative controls

F. Operational readiness:
- logging
- alerting
- retry visibility
- reconciliation visibility
- webhook failures
- stuck refund states
- support/operator tooling

G. Test-data cleanup:
- identify test orders/refunds/webhook events
- clean/archive appropriately before production
- preserve useful evidence until audit is complete

### Payment/refund exit criteria
Do not mark the audit complete until edge cases, ambiguity, reconciliation, concurrency, authorization/security, operational readiness and test-data checks have been exercised and documented.

Status: `PENDING / DEFERRED`.

This audit is non-blocking for the current catalog/Amazon sequence but must be resumed before production launch or before payment/refund functionality is declared production-ready.

## 24. Deferred work principle

A deferred feature is not automatically a missing feature or bug.

Do not opportunistically implement deferred work.

Before expanding scope, determine whether a requirement belongs to the current phase, next phase, later phase, deferred audit, or long-term vision.

## 25. Long-term roadmap

Expected evolution:
1. Canonical catalog foundation.
2. Provider-neutral listing/channel layer.
3. Shopify closed/working.
4. Amazon product-content validation foundation.
5. Amazon catalog-first matching.
6. Amazon offer/fulfillment layer.
7. Durable listing/mapping persistence.
8. Production publishing.
9. Idempotency/retry/reconciliation.
10. Additional commerce providers.
11. Broader commerce operations.
12. AI-assisted commerce workflows.

Potential later capabilities include catalog enrichment, bulk catalog operations, inventory sync, order ingestion, fulfillment, payments, refunds, returns, analytics and AI assistance.

## 26. Open architectural questions

1. Primary catalog-match UX: identifier-first, title/brand search, or combined?
2. How should confirmed Amazon catalog matches versus new-product paths be represented in `product_listings`?
3. Which offer attributes should be persisted versus derived dynamically?
4. Which representative Amazon product types should form the regression suite?
5. Which complex JSON Schema constructs should be fully evaluated locally versus delegated to Amazon?
6. When should seller-specific mappings become persistent listing data?

Do not silently make architecture-locking decisions. Surface them.

## 27. Environment configuration

Values intentionally redacted:

`AMAZON_SP_API_APPLICATION_ID`
`AMAZON_SP_API_CLIENT_ID`
`AMAZON_SP_API_CLIENT_SECRET`
`AMAZON_TOKEN_ENCRYPTION_KEY`
`AMAZON_APP_URL`
`AMAZON_MARKETPLACE_ID=A21TJRUUN4KGV`
`AMAZON_SP_API_ENDPOINT=https://sellingpartnerapi-eu.amazon.com`
`AMAZON_LWA_ENDPOINT=https://api.amazon.com/auth/o2/token`
`AMAZON_SELLER_CENTRAL_URL=https://sellercentral.amazon.in`
`AMAZON_APP_DRAFT=true`

Never put secret values in source code, documentation or commits.

## 28. Standard development workflow

1. Create isolated branch.
2. Inspect current main and recent commits.
3. Implement one focused change.
4. Run `npm run build`.
5. Run relevant tests/checks/migrations.
6. Open PR.
7. Wait for explicit user authorization.
8. Merge only after authorization.

## 29. Codex takeover procedure

When taking over the repository, DO NOT start coding.

First read:
- `AGENTS.md`
- this document
- `README.md`
- `CLAUDE.md`
- `LAUNCH.md`
- all relevant `docs/`
- relevant `Structure/` files

Then inspect the complete repository tree, recent git history, migrations, catalog services, commerce channel/listing implementation, Shopify, Amazon, authentication/tenant boundaries, tests and build configuration.

Produce a repository baseline and discrepancy report before modifying application code.

The repository must be treated as the implementation source of truth.

## 30. Glossary

**Dizito Product** — canonical provider-neutral product entity.

**Variant** — sellable product variant carrying SKU and commercial attributes.

**Listing** — provider-specific representation of a Dizito Product/Variant.

**Commerce Channel** — connected commerce destination/provider account.

**SP-API** — Amazon Selling Partner API.

**LWA** — Login with Amazon OAuth/token service.

**ASIN** — Amazon Standard Identification Number.

**EAN / UPC / GTIN / ISBN** — external product identifier families with applicability/validity rules.

**GTIN exemption** — Amazon-supported/approved route for qualifying products without a qualifying identifier.

**Product Type** — Amazon schema category used to determine requirements.

**JSON Schema** — machine-readable attribute definitions, constraints and logical rules.

**Conditional requirement** — requirement activated by schema conditions/current values.

**VALIDATION_PREVIEW** — Amazon Listings Items validation mode that tests without creating the live listing.

**Offer** — commercial/operational data such as price, condition, fulfillment and inventory.

**Media Library** — Dizito's canonical media store backed by Cloudinary.

## 31. Final snapshot

Current status: Amazon product-content validation foundation substantially implemented.

Shopify: closed/working.

Amazon: connection, LWA, discovery, schema retrieval, product-only mode, structured editor, seller identity, identity validation, conditional evaluation and validation preview implemented.

Immediate next action: inspect current main and continue catalog-first Amazon matching / existing-ASIN discovery without changing the canonical Product model.

After that: preserve new-product path → build offer layer → define persistence/reconciliation → safe live publish → broader providers.

No confirmed hard blocker.
