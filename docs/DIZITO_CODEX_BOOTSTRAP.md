# DIZITO CODEX BOOTSTRAP

You are taking over the existing Dizito Commerce project.

This is NOT a greenfield project. Do not modify application code during the first investigation.

## First read

Read:
1. `AGENTS.md`
2. `docs/DIZITO_CODEX_PROJECT_CONTEXT.md`
3. `README.md`
4. `CLAUDE.md`
5. `LAUNCH.md`
6. all relevant files under `docs/`
7. relevant files under `Structure/`

## Repository baseline

Inspect:
- complete repository tree
- recent git history
- database migrations
- canonical product/variant/media services
- commerce channel/listing tables
- Shopify implementation
- Amazon implementation
- Amazon catalog matching work
- authentication and tenant boundaries
- existing tests and build configuration

Trace actual UI → API → service/helper → database/provider call paths for commerce functionality.

## Database baseline

Inspect all migrations and produce a relationship map covering products, variants, media, inventory, channels, credentials, listings, listing variants and listing media.

Do not create migrations during this first investigation.

## Amazon baseline

Inspect the complete existing Amazon implementation, including:
- LWA authentication
- product-type discovery/fallbacks
- definition/schema retrieval
- JSON Schema representation
- conditional requirement evaluation
- identity normalization/validation
- catalog search/matching
- product-only payload construction
- VALIDATION_PREVIEW
- seller-facing UI

Do not rebuild existing capabilities.

## Shopify baseline

Inspect existing Shopify credentials, channel connection, listing/sync, media mapping, variant reconciliation and provider-specific code.

## Payment/refund baseline

Read the Payment/Refund Production Audit section in the project context.

The documented core return/refund retry scenario has passed. The production-hardening audit is intentionally PENDING/DEFERRED and is NON-BLOCKING for the current Amazon/catalog sequence.

Do not restart payment/refund work during this phase.

## Documentation/code discrepancy report

Compare repository truth against the project context and current docs.

Report:

### CONFIRMED
Where code and documentation agree.

### OUTDATED DOCUMENTATION
Where documentation describes an older state.

### UNDOCUMENTED IMPLEMENTATION
Where code contains functionality not adequately documented.

## Required output

Return a structured baseline:

# Repository Baseline

## 1. Project Identity
## 2. Current Architecture
## 3. Repository Structure and File Responsibilities
## 4. Database Schema and Relationships
## 5. Canonical Commerce Domain
## 6. Shopify State
## 7. Amazon State
## 8. Product Catalog State
## 9. Authentication and Tenant Isolation
## 10. Payment/Refund Deferred State
## 11. Completed Work
## 12. Incomplete Work
## 13. Deferred Work
## 14. Roadmap
## 15. Documentation vs Code Discrepancies
## 16. Risks
## 17. Safest Next Implementation Task

Do not modify application code until this baseline is complete.

The latest documented next direction is:

**Catalog-first Amazon matching / existing-ASIN discovery without changing the canonical Product model.**

Then preserve the no-match/new-product path and build the separate offer layer.

Do not merge PRs without explicit user authorization.
