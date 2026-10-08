# DIZITO — CODEX PROJECT CONTEXT

**Project:** Dizito — AI Commerce Operating System  
**Repository:** `rohansharma111/dizito-scheduler`  
**Current default branch:** `main`  
**Latest observed commit:** `7305bd93f654a24329040ece77acb8934852678d`  
**Last refreshed:** 2026-10-07

This document is persistent repository context for Codex and future development sessions. It is a current-state guide, not a substitute for inspecting the actual repository.

## 0. Current validation checkpoint — 2026-10-07

- The latest documentation checkpoint commit is `7305bd93f654a24329040ece77acb8934852678d`; the code checkpoint immediately before documentation refresh was `98a1610ee149f3ed33cfacdd42ca0648e7a58a87`.
- Sequential TypeScript/build errors from the current repair pass are resolved; Vercel reports success for the code checkpoint.
- The configured GitHub quality workflow remains **test → lint → build**, but no fresh GitHub Actions run is exposed for the direct push, so do not claim test/lint green without runtime evidence.
- `merge/meesho-into-main` is fully behind current `main` (635 commits behind, 0 ahead).
- Shopify publish recovery now uses listing sync claims consistently; do not bypass `claimProductListingSync` / `updateProductListingSyncState` ownership checks.

## 1. Project identity and vision

Dizito is an existing Next.js social publishing and commerce platform evolving into an AI Commerce Operating System.

It is NOT greenfield.

The strategic product flywheel is:

`Business Context → AI Strategy → Weekly Plan → Reviewed Content → Distribution → Customer Actions → Business Impact → Optimization → Next Week`

Commerce is a connected operating layer:

`Canonical Product / Variant → Commerce Channel → Provider Adapter → Draft → Publish / Sync → Reconcile`

The canonical catalog remains merchant-owned and provider-neutral.

## 2. Repository truth

Source-of-truth order:
1. current code;
2. database schema/migrations;
3. git history/current commit;
4. current project docs;
5. historical handovers;
6. conversation context.

Never assume an older handover is more current than the repository.

Before meaningful coding, inspect:
- `AGENTS.md`
- `docs/PROJECT_STATUS.md`
- `docs/IMPLEMENTATION_LOG.md`
- `README.md`
- `CLAUDE.md`
- relevant `docs/`
- relevant `Structure/`
- migrations/schema
- actual provider and marketing code.

## 3. Commerce architecture

Established boundary:

`Canonical Product/Variant → Listing → Commerce Channel/Connection → Provider Adapter/API`

Shared orchestration:
- `lib/commerce/providers/contracts.ts`
- `lib/commerce/providers/registry.ts`
- `lib/commerce/providers/service.ts`

The provider-neutral contract defines:
- draft/publish/reconcile/sync vocabulary;
- capabilities;
- succeeded/failed/ambiguous result states;
- bounded provider error data;
- authenticated tenant/channel context;
- opaque provider payload/response types;
- explicit live-publish confirmation.

Provider-specific auth, API paths, payload mapping and external identifiers stay inside provider adapters/workflows.

Do not move provider-specific requirements into canonical Product merely because a provider needs them.

## 4. Commerce domain

Canonical concepts:
- **Product:** merchant-owned product.
- **Variant:** sellable variant with SKU/commercial attributes.
- **Product Media:** canonical product/media relation.
- **Media Library:** canonical Cloudinary-backed media.
- **Commerce Channel:** external connected destination/account.
- **Listing:** provider-specific representation.
- **Listing Variant:** provider mapping at variant level.
- **External Identifier:** provider/catalog identity.
- **Publish Operation:** durable operation state used to protect provider mutations.

Known database foundations include:
`products`, `product_variants`, `product_media`, `media_library`, `commerce_channels`, `product_listings`, `product_listing_variants`, `product_listing_media`, credential tables and commerce publish-operation persistence.

Use raw SQL migrations and the existing migration runner.

## 5. Shopify

Shopify was the first commerce provider and is considered an established/closed foundation.

Existing work includes listing/sync, media mapping, variants and status/sync hardening.

Do not redesign Shopify unless a concrete dependency/regression requires it.

## 6. WooCommerce

WooCommerce is an active hardening target.

Current implementation includes:
- encrypted consumer credential storage;
- channel lookup/ownership;
- draft mapping;
- provider adapter;
- shared provider dispatch;
- draft/publish/reconcile routes;
- publish idempotency requirement;
- durable publish attempts;
- ambiguous/unknown outcomes;
- replay handling;
- provider-confirmed reconciliation;
- tenant context binding;
- guarded live mutation.

Important recent direction:
- WooCommerce draft, publish and reconciliation are routed through the shared provider service/adapter rather than being standalone orchestration paths.
- Publish operations use durable state and idempotency to avoid duplicate external writes.
- Ambiguous outcomes require reconciliation.

Production status: **not production-ready** until runtime tests, controlled provider verification and operational evidence are recorded.

## 7. Flipkart

Flipkart is now an implemented provider integration under active hardening, not merely a planned adapter.

Current implementation includes:
- `lib/platforms/flipkart/adapter.ts`
- `client.ts`
- `credentials.ts`
- `refresh-service.ts`
- `draft.ts`
- `publish.ts`
- `reconcile.ts`
- provider registration in `lib/commerce/providers/registry.ts`
- provider-neutral dispatch in `lib/commerce/providers/service.ts`
- API routes for draft/publish/reconcile.

Current safety behavior:
- authenticated user/channel ownership is required;
- credentials are refreshed when necessary;
- publish requires explicit live confirmation;
- unrestricted mutation is fail-closed behind `FLIPKART_LIVE_PUBLISH_ENABLED`;
- durable publish operations use idempotency;
- successful idempotency replay returns stored state rather than re-running provider mutation;
- terminal publish success cannot be overwritten by later failure/unknown transitions;
- reconciliation requires provider lookup evidence;
- caller-supplied external IDs cannot independently declare success;
- confirmed provider external IDs are persisted;
- external-ID mismatches are rejected.

Current verification gap:
- exact Flipkart provider response shape and authorized sandbox mutation behavior remain externally unverified;
- no production mutation flag should be enabled without controlled evidence.

## 8. Amazon India

Amazon remains an important product-content and catalog integration.

Current authentication:
- Amazon LWA OAuth 2.0;
- no IAM/SigV4 dependency for the current path.

Important files:
- `lib/platforms/amazon/client.ts`
- `lib/platforms/amazon/schema.ts`
- `lib/platforms/amazon/identity.ts`
- `lib/platforms/amazon/listings.ts`
- `components/products/ProductAmazonListing.tsx`
- `components/products/AmazonCatalogMatch.tsx`
- `components/products/AmazonOfferLayerDynamic.tsx`
- Amazon commerce API routes under `app/api/commerce/amazon/`.

Current product workflow:
1. discover Product Type;
2. retrieve Product Type Definition;
3. fetch linked JSON Schema;
4. choose explicit seller-friendly identity;
5. enter Amazon-specific facts;
6. evaluate conditional requirements against current draft;
7. build product-only payload;
8. use `VALIDATION_PREVIEW`;
9. surface Amazon validation issues.

Rules:
- Amazon schema is machine source of truth;
- Amazon remains final validation authority;
- never infer ASIN from SKU/barcode;
- never fabricate ASINs;
- explicit typed identifiers/ASINs only;
- product content and operational offer data stay separate;
- `fulfillment_availability` and similar operational fields must not leak into product-only mode.

### Catalog matching

Catalog matching is implemented, not merely planned.

`components/products/AmazonCatalogMatch.tsx` supports:
- EAN/UPC/GTIN/ISBN identifier search;
- keyword search;
- Amazon catalog result selection;
- persistence of the selected ASIN into listing provider metadata with source `catalog_match`.

Matching does not publish.

Remaining work:
- regression verification across product types;
- durable semantics for matched-ASIN vs new-product paths;
- offer/persistence/reconciliation decisions.

### Offer layer

`components/products/AmazonOfferLayerDynamic.tsx` provides a separate dynamic offer foundation for variant, price, quantity, condition, fulfillment and schema-driven attributes.

It must remain separate from product-content validation.

Remaining work:
- define persisted vs derived offer state;
- map canonical Variant/Inventory safely;
- test multi-variant behavior;
- eventually connect to safe live publishing.

## 9. Meesho

Meesho-specific implementation is blocked.

Current work:
- provider-neutral commerce contract;
- architecture/security audit;
- documented blocker.

Do not invent:
- API endpoints;
- authentication;
- payload schema;
- publish semantics;
- credentials.

Proceed only after authoritative partner/API documentation and authorized test access exist.

## 10. Marketing / AI operating system

Current marketing implementation includes:
- Business Brain/context;
- goals/offers/products/media;
- campaigns;
- content items;
- content variants;
- AI Creator;
- AI Strategist;
- Generate My Week;
- weekly plans;
- customer actions;
- attribution;
- Business Impact;
- optimizer;
- experiment workspace/learning signals.

### AI Creator

Recent hardening:
- grounds generation in selected product/offer/content/campaign context;
- carries campaign strategy context;
- accepts content-item grounding;
- requires human review before saving AI copy/channel variants;
- fails closed on malformed AI output;
- returns explicit validation errors.

Do not bypass the review gate through alternate API paths.

### AI Strategist

Recommendation-oriented. It should consume business context and observed information and produce strategy/recommendations without inventing outcomes or silently publishing.

### Generate My Week

Weekly plans are reviewable execution drafts.

Approval can persist the plan/campaign/content state, but does not automatically publish.

Recent work carries:
- optimizer evidence;
- rationale;
- experiment provenance;
- deterministic experiment disposition;
- learning context.

### Optimizer / experiments

Recent implementation adds:
- evidence-ranked opportunities/experiments;
- deterministic learning signals;
- `measure`, `refine`, `retest` experiment dispositions;
- completed-experiment direction;
- provenance through weekly approval;
- rationale/evidence shown in planning and experiment workflows.

Observed customer-action outcomes must not be presented as proof of causality.

## 11. Social account reliability

Recent fixes established:
- Pinterest reconnect does not require unnecessary board selection;
- Google Business reconnect does not require unnecessary location selection when reconnect state already supplies it;
- account health refresh is scoped to the current user;
- disconnected social targets are hidden from post listings/details.

Preserve these invariants.


### Pinterest provider-access status — 2026-10-07

- Pinterest Standard Access has been granted for Dizito.
- Public Pin publishing is authorized through the approved Pinterest API access level.
- The previous Standard Access/pending-access blocker is cleared.
- Keep the distinction between provider authorization and application runtime verification: live end-to-end Pin publication from the current build still requires explicit verification evidence.

### Google Business Profile API access — 2026-10-07

- Dizito met the documented prerequisites and submitted the current Basic API Access application.
- Google Cloud project number: `250265818721`.
- Company website submitted: `https://www.dizito.in/`.
- Use case: customer-authorized SaaS access so Dizito users can connect/manage their own Google Business Profiles through Google's OAuth flow.
- Google reported the project was not already allowlisted; current pre-approval quota is 0 requests/minute.
- Google support case: `0-3242000041809`.
- Google stated an approximate review time of 7–10 business days.
- Current status is pending allowlisting/approval.
- This external approval does not yet constitute runtime verification of OAuth, location discovery, or live post publishing.

## 12. Testing / verification model

Distinguish:
- **Implemented:** code exists;
- **Verified:** relevant test/build/provider evidence exists;
- **Production-ready:** implementation + verification + security + persistence + idempotency + reconciliation + operational readiness.

Current repository contains focused tests for:
- provider registration/dispatch;
- Flipkart draft/publish/reconcile route boundaries;
- Flipkart reconciliation persistence;
- Flipkart replay/idempotency/state transitions;
- AI Creator validation/grounding;
- optimizer/experiment behavior.

However, a fresh repository-wide green CI result for the latest head is still required before claiming overall quality readiness.

No controlled live Flipkart/WooCommerce mutation is currently certified by this document.

## 13. Deferred payment/refund audit

The payment/refund subsystem has historical PASS evidence for a failed-refund → retry-with-new-idempotency-key → successful-provider-refund scenario.

Production-hardening remains deferred:
- webhook edge cases;
- ambiguous provider timeouts;
- reconciliation;
- concurrency;
- authorization/security;
- operational readiness;
- test-data cleanup.

Do not opportunistically restart this audit.

## 14. Current engineering priorities

1. Observe/fix current CI quality results.
2. Verify provider-neutral WooCommerce and Flipkart boundaries.
3. Controlled provider verification without unsafe live mutation.
4. Verify publish-operation persistence/idempotency/reconciliation.
5. Verify AI Creator review/grounding/fail-closed paths.
6. Verify optimizer evidence/disposition/provenance end-to-end.
7. Continue Amazon catalog/offer regression and persistence work.
8. Only then expand production provider operations.

## 15. Long-term roadmap

- canonical catalog;
- provider-neutral channel/listing orchestration;
- Shopify foundation;
- Amazon catalog + offer completion;
- WooCommerce/Flipkart production-grade operations;
- durable sync/reconciliation;
- AI marketing flywheel reliability;
- Meesho after authoritative external access;
- additional providers;
- broader commerce operations;
- advanced AI-assisted commerce workflows.

## 16. Non-negotiable rules for Codex

- Do not restart the project.
- Do not redesign canonical catalog architecture without evidence.
- Do not put provider-specific fields into canonical Product merely for convenience.
- Do not infer or fabricate external identities.
- Do not let caller-supplied external IDs bypass provider reconciliation.
- Do not bypass AI review gates.
- Do not fabricate attribution or causal claims.
- Do not enable provider mutation flags just to make a test pass.
- Do not claim runtime/provider verification without evidence.
- Do not merge without explicit user authorization.
- Update persistent docs after meaningful implementation/state changes.

## 17. Standard takeover procedure

Before implementation:
1. read `AGENTS.md`;
2. read `docs/PROJECT_STATUS.md`;
3. read `docs/IMPLEMENTATION_LOG.md`;
4. read this file;
5. inspect current branch/head and recent commits;
6. inspect the actual relevant UI → API → service → DB/provider path;
7. identify completed vs pending vs verified work;
8. plan one focused change.

After implementation:
1. run relevant tests/checks;
2. inspect the diff;
3. update implementation log/status/context;
4. report exact verification and remaining risks;
5. wait for explicit merge authorization.

## 18. Current snapshot

At the latest observed main head (`2ceb7fbeaf6828e4b18e936e753d65a48cffdc1e`):
- shared commerce provider dispatch is established for WooCommerce/Flipkart;
- Flipkart draft/publish/reconcile boundaries are hardened;
- Flipkart success requires provider-confirmed reconciliation;
- commerce publish success transitions fail closed without a non-empty external ID, with focused lifecycle regression coverage;
- WooCommerce publish/reconcile uses durable/idempotent operation handling;
- Amazon catalog matching and separate offer foundation exist;
- AI Creator is grounded, review-gated and fail-closed on malformed output;
- optimizer evidence/dispositions/provenance flow into weekly planning;
- social reconnect/status/disconnected-target reliability fixes are present;
- Meesho remains blocked by external contract/access;
- overall production readiness is still pending runtime/provider verification.

This is the current baseline. Future work must start from this state, not from the older September Amazon-only handover.


## 19. Latest safety-test additions

The latest repository state also includes:
- `ee24383a78bfda2c3e03f65d60eb84849b65bb42`: publish success requires a non-empty provider-confirmed external ID and persists it explicitly.
- `c0e6b8ed4c760208adb6b537480e31549e8d8b34`: lifecycle tests enforce legal publish state transitions.
- `f3bda849a663a5dde97ec076051cf6daa0e3e2f2`: deterministic Flipkart client transport-contract tests.
- `bb01a2701ebf5df54d67386e2f8a371216b2d74c`: provider verification seam documented.

These tests are deterministic repository tests. They do not replace live/sandbox provider verification.

### Commerce code-level hardening — 2026-10-06
The active Commerce provider boundary now treats provider mutations as tenant-scoped state machines: runtime capability/confirmation checks are enforced centrally; publish success is bound to the requested listing/provider and confirmed external identity; WooCommerce channel credential lookup is tenant-scoped; WooCommerce publish requires provider read-back reconciliation before terminal success. Testing is intentionally deferred until the code-level implementation pass is complete.

### Commerce hardening continuation — 2026-10-06
The publish ledger now reserves idempotency keys atomically and validates listing/provider/operation identity, preventing concurrent duplicate mutations and cross-operation key reuse. WooCommerce provider mutation state remains ambiguous until read-back reconciliation, including when post-mutation persistence fails; its API exposes that state as HTTP 202 rather than a false publish success.

### Shopify tenant boundary hardening — 2026-10-06
Shopify provider GraphQL calls now require authenticated tenant context and resolve channels through tenant-scoped lookup. Related connect/callback and channel-list routes validate session identity before provider/database operations.

### Commerce tenant-integrity and canonical fingerprint hardening — 2026-10-06
- Added tenant-integrity constraints for Commerce channel/listing/publish-ledger relationships.
- Canonicalized publish request fingerprints for deterministic idempotency behavior.

### WooCommerce lifecycle state-machine hardening — 2026-10-06
- Corrected the WooCommerce post-provider listing persistence parameter binding so a successful remote mutation cannot be recorded against the wrong database row.
- Reconciliation now rejects conflicting existing external IDs and provider-mismatched durable attempts, and the final listing update only succeeds when the existing external ID is null or matches the provider-confirmed ID.

### Provider adapter outcome normalization — 2026-10-06
- WooCommerce adapter now checks reconciliation-required outcomes before generic error normalization, preserving ambiguous publish state and preventing accidental retry classification.
- Flipkart publish adapter outcomes are normalized so disabled/not-found/failed states cannot be mistaken for reconciliation success.

### Flipkart reconciliation state-consistency hardening — 2026-10-06
- Reconciliation validates the tenant/listing/provider-bound publish operation before provider lookup.
- Confirmed external identity is now persisted transactionally to both the provider-neutral publish ledger and product listing state.
- Existing conflicting listing external identities are protected from overwrite.
- Flipkart reconciliation now returns provider-neutral deterministic failures or retryable ambiguity rather than leaking raw exceptions.
- WooCommerce reconciliation POST authentication now uses the validated session user ID consistently.
### Commerce provider-entry audit — 2026-10-06
- WooCommerce publish route now uses the validated authenticated tenant ID.
- Shopify credential access is tenant/provider scoped at the credential helper boundary, not only at the caller.
- Shopify OAuth callback and token-refresh persistence carry authenticated tenant context.
- Shopify shop lookup requires explicit tenant context.


### Commerce credential/provider-client hardening checkpoint — 2026-10-06
- Flipkart credential save, OAuth callback, and token-refresh persistence are tenant-bound; provider and channel ownership are verified at the credential helper boundary.
- Flipkart publish API now exposes ambiguous/reconciliation-required submissions as HTTP 202 and keeps confirmed/idempotent outcomes distinct.
- Amazon credential save/read and SP-API provider access now require explicit authenticated tenant context; unscoped internal channel resolution was removed from the Amazon client path.
- Amazon product-type discovery and connection verification propagate tenant identity to provider access.
- Testing remains intentionally deferred until the code-level implementation pass is complete; these changes are implemented but not yet repository-verified.


### Shopify legacy publish safety checkpoint — 2026-10-06
- Direct Shopify publishing now requires explicit live-publish confirmation at both the route and publisher boundaries.
- The Shopify path remains legacy/direct rather than being represented as a shared durable provider operation; idempotency and durable mutation tracking remain a separate future hardening item.


### Shopify publish concurrency checkpoint — 2026-10-06
- Legacy direct Shopify publishing now serializes the same tenant/channel/product with a PostgreSQL advisory lock across the full remote mutation lifecycle.
- This closes the concurrent-create race without inventing a Shopify idempotency contract.
- Provider-native/durable crash recovery remains separate follow-up work.


### Shopify deterministic recovery checkpoint — 2026-10-06
- Shopify creates now carry a `dizito.listing_id` metafield marker, enabling exact recovery of a remote product after a local persistence crash.
- The publisher searches by the marker before creating; one match is reconciled, multiple matches fail closed.
- Partial-create variant recovery recognizes the sole existing provider variant as the canonical first variant when no local mapping exists.
- Legacy orphan products without the marker are not automatically claimed by heuristic matching.


### Amazon tenant-boundary completion checkpoint — 2026-10-06
- Amazon SP-API helpers for catalog, listing, offers, product types, and verification now require explicit authenticated tenant context.
- OAuth credential persistence is tenant-scoped at the callback boundary.
- No Amazon provider helper intentionally accepts channel-only access after this checkpoint.


### Commerce channel identity race hardening — 2026-10-06
- OAuth-backed Commerce channels now have a database-enforced unique identity per tenant/provider/external account.
- Application channel creation handles a concurrent uniqueness conflict by resolving the existing channel, making reconnect creation race-safe.


### WooCommerce ambiguity propagation checkpoint — 2026-10-06
- Remote publish uncertainty and local persistence uncertainty are now preserved as an explicit ambiguous provider outcome throughout publish, adapter, reconciliation, and HTTP response layers.
- HTTP 202 is used when reconciliation is required; deterministic validation and ownership failures remain non-ambiguous.


### Commerce channel boundary checkpoint — 2026-10-06
- No repository caller remains for the previously available unscoped channel lookup helper.
- Channel metadata updates now use row locking to avoid lost concurrent updates during reconnect/status/metadata changes.
- Credential tables remain one-to-one with commerce channels through database foreign keys and unique channel IDs.
\n\n### Marketing execution provenance hardening — 2026-10-07\n- The marketing execution path now durably records the selected channel variant alongside the existing Content Item → Post mapping.\n- Migration `020_marketing_content_item_variant_posts_v1.sql` adds `marketing_content_item_posts.variant_id` with a composite FK to the variant and its parent Content Item, preventing cross-Content-Item provenance.\n- Content Item → Post conversion persists the selected variant; manual attribution rejects a Variant → Post claim unless that durable execution relationship exists.\n- Existing rows remain compatible because variant provenance is nullable for historical Content Item → Post records.\n- This is implemented source-level state, not runtime-verified behavior; tests/lint/build/database/provider verification remain pending.\n\n\n### Marketing attribution propagation hardening — 2026-10-07\n- Business Impact now propagates explicit manual attribution at Content Item, Variant, and Post levels alongside the existing campaign summary.\n- The Optimizer consumes attributed Variant/Content evidence and returns it with each relevant opportunity, while retaining the observational-versus-attributed distinction.\n- Attribution remains explicit/manual evidence only and is never promoted to causal proof.\n- Implementation is source-level only; runtime verification remains pending.\n

### Marketing provenance consumer hardening — 2026-10-07
- The legacy Content Item → Post API now supports an optional variantId; when supplied, it must belong to the same Content Item and its platform must be represented in the Post's targets before the link is persisted.
- Content Item reads expose postLinks as { postId, variantId } alongside the backward-compatible postIds list.
- Optimizer opportunities now return and render attributedOutcome separately from observedOutcome, preserving the distinction between explicit attribution and observational evidence.
- These changes are implemented but not runtime-verified; tests/lint/build/database/provider verification remain pending.


- Content Item → Post upsert semantics preserve established variant provenance and only backfill a missing variant ID, preventing later legacy calls from erasing execution identity.


## Latest V1 launch context — 2026-10-07

Dizito is now in **V1 Beta completion + production hardening**, not greenfield feature development.

V1 is defined by the complete merchant marketing loop:
Business Context → AI Strategy → Weekly Plan → Human Review → Approval → Platform-specific Distribution → Customer Actions → Business Impact → Optimization → Next Week.

### Launch-critical work
1. Marketing UI completion.
2. Distinctive Dizito design system.
3. Subscription/pricing/entitlement redesign.
4. Video/media capability architecture.
5. Security and tenant-isolation audit.
6. Fresh CI/runtime evidence.
7. Meta/Pinterest/Google/provider external verification.
8. Beta onboarding/recovery UX.

### External access state
- Meta `business_management` App Review: in progress.
- Pinterest Standard Access: granted; live current-build Pin verification still required.
- Google Business Profile API: application required.
- Meesho: blocked pending authoritative contract/access.

### Infrastructure finding
Current Neon database is approximately 12 MB with 46 public tables and 156 public indexes. Current data volume is tiny. No migration is justified by storage. Future scaling concern is event/log growth, query/index behavior and background job throughput.

Current beta stack remains:
GitHub + Vercel + Neon + Cloudinary + Razorpay + provider APIs.

### Video
Media storage already has video-aware foundations, but publishing is not uniformly video-capable. Introduce platform capability metadata and platform-specific workflows. Large videos should move to direct/signed Cloudinary upload. Never treat video as an image URL.

### Pricing
Historical Creator/Agency pricing is no longer an accurate representation of Dizito. Planning hypothesis:
Free / Growth ~₹799 / Pro ~₹1,999 / Agency ~₹4,999+ with a founding-beta ~₹499 offer. Treat these as hypotheses, not implementation facts.

### Security
No “fully secure” claim is allowed yet. Verify actual credential encryption, authorization/tenant isolation, OAuth, webhook signatures/replay, upload security, rate limits, secret/log handling and dependency/platform security.

### Parallel development
Use `docs/DIZITO_PARALLEL_WORKSTREAMS.md` to split work across independent chats. Every workstream owns specific files/systems, uses its own branch, avoids shared-file conflicts, runs focused verification, and must provide a continuation checkpoint before chat limits are reached.

## 2026-10-07 — Workstream A UI checkpoint

- Branch: `v1/marketing-ui-design`.
- Marketing V1 UI is being consolidated around a reusable Dizito design system in `components/dizito/DizitoUI.tsx` and `app/globals.css`.
- The protected shell now treats Business Brain → Strategist → Generate My Week → Content Review → Business Impact → Optimizer as the primary merchant operating loop, with Media and Channels & Accounts as supporting surfaces.
- Business Brain now has a dedicated read surface using the existing tenant-scoped API; this is presentation-only and does not alter persistence.
- UI changes are intentionally isolated from billing business logic, provider adapters, commerce architecture, media-provider implementation and database migrations.
- Current verification boundary: source/diff inspection only. No fresh GitHub Actions run is exposed for the branch; do not claim repository-wide test/lint/build green. Browser/provider runtime verification remains pending.


### Workstream A UI continuation — 2026-10-08
- Merchant-context audit confirmed the current marketing API surface: Goals and Offers are creation/listing endpoints, while a dedicated Services API is not present.
- UI scope therefore remains presentation/action work against existing contracts; no unsupported CRUD or schema was introduced.
- Generate My Week now uses shared Dizito visual primitives without changing the weekly-plan generation or approval contracts. Approval remains separate from scheduling/publishing.
- Product Edit state markup was corrected after source inspection.
- Runtime verification remains pending; source sanity checks are the current verification boundary.


### Workstream A distribution UI continuation — 2026-10-08
- Marketing Content, Posts, Drafts and Calendar now use shared Dizito shell/state primitives for consistent loading, empty and error/recovery presentation.
- Existing scheduling, publishing, account-selection and child component behavior is preserved.
- No backend, schema, provider or commerce changes were introduced; runtime verification remains pending.


### 2026-10-08 — Workstream A UI consistency continuation
- Shared Dizito visual primitives are now used on the Channels & Accounts and Activity surfaces.
- UI-only scope remains enforced: no new persistence model, API contract, provider adapter, billing logic, commerce architecture, or media provider implementation was introduced.
- Source-level verification was performed after the Activity JSX correction; runtime build/browser verification remains unavailable in this session.


### 2026-10-08 — Workstream A merchant-surface consistency continuation
- Polished `app/(protected)/analytics/page.tsx` with Dizito page, metric, card, badge, and state primitives while preserving `/api/analytics`, premium gating, platform breakdown, insights, and recent-activity semantics.
- Polished `app/(protected)/campaigns/page.tsx` with Dizito cards, badges, buttons, responsive form controls, and state presentation while preserving campaign CRUD/status transitions, Business Brain relationships, Content Item creation/review flow, experiment links, and observed-impact reporting.
- No backend/API/provider/database/billing/media architecture changes were introduced.

### 2026-10-08 — Workstream A final merchant-surface consistency pass
- Completed the planned V1 merchant UI consistency sweep across remaining legacy high-traffic surfaces: Experiments, Attribution, Settings, and Bulk Upload with shared Dizito UI primitives and responsive states.
- Corrected a navigation formatting defect in SidebarClient.tsx during source audit; no product behavior was changed.
- Workstream remains UI-only: no provider adapters, backend contracts, billing logic, commerce architecture, media implementation, or database schema changes were introduced.
- Runtime verification remains pending outside this environment.
