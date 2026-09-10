# Dizito Development Instructions

## Project identity
Dizito is an existing commerce and social publishing platform. This is NOT a greenfield project.

The repository is `rohansharma111/dizito-scheduler`. Do not restart, redesign, or replace completed architecture without repository evidence and explicit approval.

## Source-of-truth order
1. Current repository code
2. Current database schema and migrations
3. Git history
4. Current project documentation
5. Historical handover documents
6. Conversation context
7. General framework knowledge

If sources disagree, identify the discrepancy rather than silently choosing one.

## Mandatory workflow
DISCOVER → VERIFY → PLAN → IMPLEMENT → TEST → REVIEW → DOCUMENT

Before significant coding, inspect relevant code, migrations, services/helpers, API routes, UI, docs, and recent git history.

## Commerce architecture
Canonical Dizito Product/Variant data must remain provider-neutral.

Established boundary:
Canonical Product/Variant → Listing → Commerce Channel/Connection → Provider Adapter/API

Do not put Amazon- or Shopify-specific requirements into the canonical Product merely because a provider requires them. Provider-specific requirements should be translated at runtime by provider adapters/workflows.

## Current Amazon architecture
Target: Amazon India / Seller Central through SP-API.

Current authentication: Amazon LWA OAuth 2.0. Do not add IAM/SigV4 unless an explicit future requirement proves it necessary.

Current product-content workflow uses `LISTING_PRODUCT_ONLY`.

`LISTING_OFFER_ONLY` is reserved for the future offer layer.

Amazon Product Type Definitions JSON Schema is the machine-readable source of truth. Amazon validation remains the final authority.

Never infer Amazon identity from SKU/barcode. Never fabricate ASINs. Require explicit typed identifiers or explicit existing ASINs, or a supported exemption workflow.

Conditional requirements must be evaluated against the current draft. Do not treat every conditional branch as universally required.

## Product / offer boundary
Product content and operational offer data are separate.

Do not place `fulfillment_availability` or similar operational offer fields into the current product-content workflow.

The future offer layer should derive price, condition, fulfillment and inventory from canonical Variant/Inventory data and produce offer-specific Amazon payloads.

## Current next direction
Immediate next task: catalog-first Amazon matching / existing-ASIN discovery.

Then:
1. preserve the no-match/new-product workflow
2. build the separate offer layer
3. add regression fixtures/tests for conditional schemas and identity/payload safety
4. test multiple Amazon product types
5. add local validation where practical
6. decide durable listing/mapping persistence
7. implement idempotent production publishing, retries and reconciliation
8. expand to additional commerce providers

## Database rules
Use raw SQL migrations following the repository's migration runner.

Known commerce/catalog tables include:
- products
- product_variants
- product_media
- media_library
- commerce_channels
- product_listings
- product_listing_variants
- commerce_channel_credentials
- product_listing_media
- amazon_channel_credentials

Preserve tenant ownership and existing relationships. Do not create duplicate domain tables without evidence.

## Security
Never expose or commit credentials, refresh tokens, API secrets, encryption keys, or database passwords.

Validate authentication and tenant ownership on commerce mutations.

## UI
Reuse the existing application shell, navigation, components and visual language. Do not build duplicate architecture when an existing component/service can be extended.

## Testing
Do not claim completion merely because code compiles. Run relevant build, lint, type checks, tests, migration checks and integration verification. Distinguish local/mocked verification from real provider verification.

## Git / PR rules
Work in an isolated branch. Make focused commits. Run `npm run build` before PR/merge.

Do NOT merge PRs without explicit user authorization.

## Scope discipline
Payment/refund production audit work is explicitly deferred and does not block the current Amazon phase. Do not opportunistically implement later-phase features.

## Framework rule
This project uses Next.js App Router + TypeScript. Before framework-level changes, inspect the installed Next.js documentation and repository conventions.

## Definition of done
A task is done only when implementation, security/tenant boundaries, schema/API/UI behavior, verification, regression risk, and required documentation have been addressed.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
