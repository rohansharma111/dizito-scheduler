# Dizito Project Status & Roadmap

**Last updated:** 2026-10-06  
**Repository:** `rohansharma111/dizito-scheduler`  
**Branch:** `main`  
**Project:** Dizito — AI Commerce Operating System

> This is the canonical working status document for the repository. Update it whenever a meaningful implementation, decision, verification result, scope change, or blocker occurs. Do not mark work complete based only on code being written; distinguish implemented, verified, and production-ready.

## 1. Vision and non-negotiable architecture

Dizito is an existing social publishing and commerce platform evolving into an AI Commerce Operating System.

The long-term product direction is a merchant-owned, provider-neutral canonical catalog connected to external channels through reusable adapters:

```text
Canonical Product / Variant
        ↓
Commerce Channel / Connection
        ↓
Provider-specific Listing Workflow
        ↓
Validate → Publish / Sync → Monitor → Reconcile
```

Core principles:

- Canonical Products and Variants remain provider-neutral.
- A marketplace or store is a channel, not the canonical source of truth.
- Provider-specific requirements belong in provider adapters and workflows.
- Tenant ownership must be enforced on every commerce mutation.
- No credentials, refresh tokens, API secrets, encryption keys, or passwords may be committed or exposed.
- Existing architecture must not be restarted or redesigned without repository evidence.
- Product content and operational offer data must remain separate.
- Production publishing requires durable state, idempotency, retry behavior, and reconciliation.

## 2. Status vocabulary

Use these labels in future updates:

- **Implemented:** Code exists in the repository.
- **Verified:** Relevant tests, build, mocked flow, or provider check has actually been run and recorded.
- **Production-ready:** Implemented and verified with security, ownership, persistence, failure handling, idempotency, and operational concerns addressed.
- **Blocked:** Work cannot safely proceed because a dependency, credential, provider approval, or decision is missing.
- **Deferred:** Intentionally postponed by scope decision; not necessarily unfinished core functionality.

## 3. Current overall state

### Current phase

**Commerce foundation expansion: WooCommerce connection/draft/publish foundation, while preserving the existing Amazon catalog-first direction.**

### Current implementation state

- Existing social publishing capabilities remain in place.
- Canonical catalog, variants, media, inventory, channels, listings, and credentials foundations exist.
- Shopify integration is treated as an established/closed foundation unless a concrete dependency requires changes.
- Amazon India product-content workflow is established around SP-API/LWA, schema-driven requirements, explicit identity, conditional evaluation, and product-only validation preview.
- WooCommerce connection, encrypted credential storage, draft preparation, duplicate connection protection, and guarded publish endpoint have been added.

### Important qualification

The latest WooCommerce work is a **foundation**, not a declaration that live commerce is production-ready. Full listing synchronization, idempotency, durable publish state, external ID persistence, retries, reconciliation, and end-to-end provider verification remain required.

## 4. Recently implemented repository work

### WooCommerce

| Capability | Status | Repository evidence |
|---|---|---|
| Product payload mapper | Implemented | `lib/platforms/woocommerce/mapper.ts` |
| WooCommerce REST client | Implemented | `lib/platforms/woocommerce/client.ts` |
| Encrypted consumer key/secret storage | Implemented | `lib/platforms/woocommerce/credentials.ts` |
| Channel configuration lookup | Implemented | `lib/platforms/woocommerce/client.ts` |
| Draft listing preparation | Implemented | `lib/platforms/woocommerce/draft.ts` |
| Draft API endpoint | Implemented | `app/api/commerce/woocommerce/draft/route.ts` |
| Store connection endpoint | Implemented | `app/api/commerce/woocommerce/connect/route.ts` |
| Duplicate store connection protection | Implemented | Commit `38ea9e5ca949f823bae83f9d7be2017c04f32169` |
| Credential persistence failure state handling | Implemented | `connect/route.ts` |
| Explicit live-publish guard | Implemented | Commit `1d30530f92a658a933d39266a2e67f5e9826954b` |
| Guarded publish API endpoint | Implemented | Commit `451274ad342e1b8428f9f449bd5a27a1baa2c813` |
| Full production-grade sync/reconciliation | Pending | Not yet implemented/verified |

### Amazon

The existing Amazon direction remains:

1. Discover product type.
2. Retrieve the product-type definition and linked schema.
3. Evaluate conditional requirements against the current draft.
4. Use explicit seller-friendly identity controls.
5. Keep product content separate from offer/fulfillment data.
6. Use Amazon validation as the final authority.
7. Proceed next toward catalog-first matching and existing-ASIN discovery.

Do not infer ASINs from SKU or barcode. Do not fabricate identifiers. Do not place operational offer fields such as `fulfillment_availability` into the product-only workflow.

## 5. Priority roadmap

### P0 — Must complete before declaring WooCommerce live commerce production-ready

- [ ] Review and verify the actual publish service and endpoint behavior against current database schema.
- [ ] Persist the WooCommerce external product ID after successful creation.
- [ ] Persist listing and variant publish state transitions.
- [ ] Prevent duplicate live product creation through idempotency keys or deterministic external mapping.
- [ ] Define behavior for re-publishing an existing listing: create vs update.
- [ ] Add tenant ownership checks to every publish path.
- [ ] Add provider error persistence and safe retry behavior.
- [ ] Add timeout and response validation handling for provider requests.
- [ ] Add end-to-end mocked tests for success, provider rejection, credential failure, duplicate publish, and retry.
- [ ] Run and record build, lint, type-check, and relevant tests.
- [ ] Perform a controlled WooCommerce sandbox/store verification before any real merchant use.

### P1 — Commerce foundation hardening

- [x] Introduce a provider-neutral publish/sync result contract (`lib/commerce/providers/contracts.ts`); migrate existing providers to it only after behavior-preserving test coverage.
- [ ] Define listing lifecycle states and legal transitions.
- [ ] Define listing-variant mapping behavior for simple and variable products.
- [ ] Add explicit inventory and price synchronization boundaries.
- [ ] Add reconciliation for local listings versus external provider state.
- [ ] Add retry policy with idempotency and backoff.
- [ ] Add audit events for connect, draft, publish, update, failure, retry, and reconciliation.
- [ ] Ensure channel credential rotation and revocation behavior is defined.
- [ ] Verify URL normalization and channel uniqueness under concurrent requests.
- [ ] Review database constraints for duplicate channels and listing mappings.

### P1 — Amazon next direction

- [ ] Implement catalog-first matching / existing-ASIN discovery.
- [ ] Define the UX: identifier-first, title/brand search, or combined approach.
- [ ] Define persistence for confirmed catalog matches and no-match/new-product paths.
- [ ] Preserve the current product-only new-product workflow.
- [ ] Build the separate Amazon offer layer from canonical Variant/Inventory data.
- [ ] Keep price, condition, fulfillment, and inventory out of product-content payloads.
- [ ] Add regression fixtures for `if/then/else`, `allOf`, `anyOf`, `oneOf`, nested arrays, and inactive branches.
- [ ] Test multiple representative Amazon product types.
- [ ] Add identity/payload-builder unit tests, including valid and invalid GTIN/EAN/UPC/ISBN cases.

### P2 — Product and channel operations

- [ ] Complete provider-neutral listing management UI.
- [ ] Add channel health/status views.
- [ ] Add listing error and retry UI.
- [ ] Add bulk draft and bulk publish workflows with explicit safeguards.
- [ ] Add channel-specific mapping review before publication.
- [ ] Add operational observability and structured logs.
- [ ] Add role/permission review for high-impact commerce actions.

### P3 — Expansion after the foundation is stable

- [ ] Flipkart adapter and workflow.
- [ ] Meesho adapter and workflow.
- [ ] Additional Shopify/WooCommerce operational sync features.
- [ ] Orders, fulfillment, returns, payments, refunds, analytics, automation, and AI-assisted workflows according to separate approved scope.
- [ ] Do not opportunistically implement later-phase capabilities while P0/P1 reliability work is incomplete.

## 6. V1 launch gate

A feature may be considered for Dizito V1 only when the following are true for the relevant scope:

- [ ] The user-facing workflow is complete enough for a real merchant task.
- [ ] Authentication and tenant ownership are enforced.
- [ ] Provider credentials are encrypted and never returned in responses.
- [ ] Failure states are persisted or safely surfaced.
- [ ] Duplicate operations are prevented or safely reconciled.
- [ ] Retry behavior is explicit and idempotent.
- [ ] The database state remains consistent after provider failure.
- [ ] Build/type/lint checks are recorded.
- [ ] Relevant mocked tests exist.
- [ ] At least one controlled provider verification has been completed where applicable.
- [ ] Documentation and known limitations are updated.

The presence of an endpoint alone is not a launch gate.

## 7. Verification ledger

Record verification here with date, scope, method, and result. Do not write “passed” without evidence.

### Confirmed historical/current verification

- Amazon OAuth/LWA connection and callback were exercised in prior work.
- Amazon product-type discovery and linked schema retrieval were exercised in prior work.
- Amazon product-only validation preview returned real provider issues in prior work.
- Amazon seller-friendly identity and checksum validation were exercised in prior work.
- WooCommerce duplicate connection protection is committed and present in the repository.
- WooCommerce publish guard and endpoint are committed and present in the repository.

### Still requiring explicit verification

- [ ] Current repository build after latest WooCommerce commits.
- [ ] Current repository lint/type checks after latest WooCommerce commits.
- [ ] WooCommerce connect endpoint against a real or controlled test store.
- [ ] WooCommerce draft endpoint against current schema and ownership rules.
- [ ] WooCommerce publish success path.
- [ ] WooCommerce publish failure and channel-error path.
- [ ] WooCommerce duplicate publish behavior.
- [ ] WooCommerce retry/idempotency behavior.
- [ ] WooCommerce variable-product variant mapping.
- [ ] Amazon matching and offer-layer behavior.

## 8. Known deferred work

The payment/refund production audit is intentionally deferred from the current commerce-provider phase. It must not be silently forgotten, but it also must not be treated as proof that the core refund flow is incomplete. When revisited, use the audit document and current repository/database truth as the starting point.

Other intentionally deferred or future areas include:

- broad live publishing before reliability gates are complete
- generalized retries and reconciliation across all providers
- durable ASIN persistence decisions
- broad Marketing UI work
- additional marketplace adapters beyond the current phase

## 9. Working rules for future contributors and ChatGPT sessions

Before changing code:

1. Read this file.
2. Inspect the current repository implementation, migrations, and recent commits.
3. Identify whether the task is implementation, verification, hardening, or documentation.
4. Do not repeat completed architecture without evidence of a defect.
5. Preserve provider-neutral canonical data.
6. Check tenant ownership and credential safety.
7. Make focused commits.
8. Record the commit SHA and verification status here after meaningful work.

After changing code:

- Update the relevant status row or checklist.
- Add the commit SHA.
- Record what was verified and what was not verified.
- Record new risks, blockers, and follow-up tasks.
- Never convert “implemented” into “production-ready” without evidence.


### 2026-10-06 — Meesho provider architecture hardening

- Status: Implemented / Blocked for provider-specific implementation
- Commits:
  - `3108264c8a4c90025e7779119b55af7f3ffb1cec` — provider-neutral adapter contracts
  - `3754711aabba2cffab7d341ca2488b477bba9a35` — project status update
  - `36fdc48bfbd8bdaa68b0cb7a90ee03e4c84e3be5` — Meesho architecture/security audit refresh
- Files:
  - `lib/commerce/providers/contracts.ts`
  - `docs/MEESHO_PROVIDER_ARCHITECTURE_AUDIT.md`
  - `docs/IMPLEMENTATION_LOG.md`
- Implementation:
  - Added a provider-neutral operation/capability/result contract without assuming Meesho API behavior.
  - Confirmed shared channel/listing persistence is provider-neutral and tenant-scoped.
  - Confirmed WooCommerce credential retrieval is owner-scoped before decryption.
- Verification:
  - GitHub source inspection and repository writes completed.
  - Local build, lint, type-check, automated tests, migration execution, database execution, and provider calls were not run.
- Remaining risk/blocker:
  - Meesho-specific client/auth/publish code remains blocked pending authoritative Meesho API/partner documentation and authorized test access.
- Next action:
  - Migrate WooCommerce workflow to the shared contract with behavior-preserving tests, then establish provider dispatch. Do not implement Meesho endpoints until the external contract is verified.

## 10. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-22 | Maintain this file as the canonical project tracker | Keep project vision, progress, pending work, verification, and launch gates visible to the user and future contributors |
| 2026-09-22 | Treat WooCommerce publishing as guarded foundation only | Live provider writes require idempotency, durable state, retries, reconciliation, and controlled verification |
| 2026-09-22 | Preserve Amazon catalog-first direction in parallel | Amazon matching and offer separation remain important to the long-term commerce architecture |

## 11. Update template

Use this compact format for future entries:

```md
### YYYY-MM-DD — <change>

- Status: Implemented / Verified / Production-ready / Blocked / Deferred
- Commit: `<sha>`
- Files:
  - `<path>`
- Verification:
  - <exact command, provider check, or reason not run>
- Remaining risk:
  - <known limitation>
- Next action:
  - <specific follow-up>
```
