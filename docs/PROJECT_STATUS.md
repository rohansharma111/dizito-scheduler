# Dizito Project Status & Roadmap

**Last updated:** 2026-10-06  
**Repository:** `rohansharma111/dizito-scheduler`  
**Default branch:** `main`  
**Latest observed commit:** `d2ae5a76bcf11a10e14002d1f65ef562c29cf4db`  
**Project:** Dizito — AI Commerce Operating System

> This is the canonical working status document. Repository code/schema and observed verification are authoritative. “Implemented” does not mean “verified,” and “verified” does not mean “production-ready.”

## 1. Current phase

**AI Commerce Operating System integration + production hardening**

The repository has moved beyond a single-provider Amazon/Shopify commerce foundation. Current work is converging on two reusable operating layers:

1. **Provider-neutral commerce orchestration** for connected commerce channels.
2. **Evidence-grounded AI marketing execution** from business context → weekly plan → reviewed content → customer actions → measurement → optimization.

The immediate engineering priority is reliability and verification of the shared boundaries, not adding arbitrary new features.

## 2. Product vision

Dizito is an existing social publishing + commerce platform evolving into an AI Commerce Operating System.

Long-term flywheel:

`Business Context → AI Strategy → Weekly Plan → Reviewed Content → Distribution → Customer Actions → Business Impact → Optimization → Next Week`

Commerce operates alongside that loop:

`Canonical Product / Variant → Commerce Channel → Provider Adapter → Draft → Publish / Sync → Reconcile → Monitor`

Core principles:
- canonical Product/Variant data remains provider-neutral;
- channels represent external destinations/accounts;
- provider-specific auth, payloads and identifiers remain inside adapters/workflows;
- tenant ownership is mandatory on mutations;
- credentials are encrypted and never exposed;
- product content and operational offer data remain separate;
- provider mutations require durable state, idempotency, failure classification and reconciliation;
- AI output must remain grounded, reviewable and fail-closed on malformed output;
- attribution must be evidence-based rather than fabricated.

## 3. Current implementation snapshot

### Core application
**Implemented / established**
- Next.js App Router application and protected dashboard.
- Catalog/products/variants/media/inventory foundations.
- Orders, billing/payment foundations.
- Social publishing, scheduling, drafts, retry/bulk workflows.
- Existing scheduler workflow remains intentionally preserved.

### Commerce
**Implemented foundations**
- Canonical Product/Variant → Listing → Channel architecture.
- Provider-neutral commerce adapter contracts and registry/service.
- Shopify foundation considered closed/working.
- WooCommerce connection, encrypted credentials, draft, publish, reconciliation and publish-operation/idempotency hardening.
- Flipkart adapter, shared provider registration, draft/publish/reconcile routes, idempotency/state hardening and provider-confirmed reconciliation.
- Amazon India product-content foundation, catalog matching and offer-layer foundation.
- Meesho architecture/security audit and provider-neutral contract direction; provider-specific implementation blocked.

### Marketing / AI
**Implemented foundations**
- Business Brain/context.
- Goals, offers, products, media, campaigns and content items.
- AI Creator with product/offer/content/campaign grounding.
- Human review requirement before saving AI copy/channel variants.
- AI Strategist.
- Generate My Week / weekly plans.
- Customer actions and explicit attribution.
- Business Impact.
- Optimizer with evidence/provenance and deterministic experiment dispositions.
- Weekly planning/approval carries optimizer rationale, evidence, provenance and experiment disposition.

### Social account reliability
Recent fixes cover:
- reconnect routing;
- Pinterest reconnect without unnecessary board selection;
- Google Business reconnect without unnecessary location selection;
- user-scoped account health refresh;
- hiding disconnected targets from post listings/details.

## 4. Commerce provider architecture

Shared files:
- `lib/commerce/providers/contracts.ts`
- `lib/commerce/providers/registry.ts`
- `lib/commerce/providers/service.ts`

The contract currently standardizes:
- draft
- publish
- reconcile
- sync vocabulary
- capability flags
- bounded succeeded/failed/ambiguous results
- tenant/channel context
- opaque provider payload/response types
- explicit live-publish confirmation

### Commerce code-level hardening checkpoint — 2026-10-06

Completed code-level hardening before deferred test pass:
- Flipkart draft/publish/reconcile routes now reject invalid session user identities before provider dispatch.
- Provider-neutral publish success is bound to the tenant, listing, and provider before terminal success is persisted.
- Provider-neutral dispatcher enforces draft/publish capabilities and live-publish confirmation at runtime, not only through TypeScript types.
- WooCommerce channel credential/config lookup is tenant-scoped by authenticated user.
- WooCommerce publish no longer marks a listing successful solely from the create response; it records an ambiguous/submitted attempt and requires provider read-back reconciliation before success.
- WooCommerce adapter now exposes that publish state as provider-neutral `ambiguous / RECONCILIATION_REQUIRED` until reconciliation confirms the provider product.

**Verification policy:** full test/lint/build pass is intentionally deferred until the remaining code-level implementation work is complete, per the development workflow for this phase.

### WooCommerce current state

Implemented:
- adapter dispatch;
- draft route;
- publish route;
- reconciliation route;
- tenant/channel context binding;
- encrypted credentials;
- publish idempotency requirement;
- durable publish attempts;
- ambiguous/unknown handling;
- replay protection;
- reconciliation identity checks;
- provider error mapping.

**Not production-ready yet:** controlled provider verification, current CI/runtime evidence, durable external-state verification and broader operational sync.

### Flipkart current state

Implemented:
- provider adapter and registry;
- client with sandbox/production environments;
- credential retrieval and access-token refresh;
- draft route;
- publish route;
- reconciliation route;
- shared provider dispatch;
- idempotency conflict handling;
- publish replay protection;
- terminal state protection;
- provider lookup requirement before reconciliation success;
- provider-confirmed external ID persistence;
- mismatch rejection;
- live mutation fail-closed behind `FLIPKART_LIVE_PUBLISH_ENABLED`;
- explicit live-publish confirmation.

**Important limitation:** exact live Flipkart response shapes and authorized sandbox mutation behavior remain externally unverified. Do not mark Flipkart production-ready or enable unrestricted mutation without evidence.

### Amazon current state

Implemented:
- Amazon India channel/auth foundation using LWA OAuth;
- product-type discovery;
- linked JSON Schema retrieval;
- schema-driven product editor;
- conditional requirement evaluation;
- explicit typed identifier/ASIN handling;
- product-only validation preview;
- catalog search/matching UI and API;
- selected ASIN persisted into listing provider metadata;
- separate dynamic offer-layer foundation.

Rules:
- never infer ASIN/identity from SKU or barcode;
- never fabricate ASINs;
- never leak offer fields such as `fulfillment_availability` into product-only validation;
- Amazon remains the final validation authority.

**Remaining:** deeper catalog-match regression verification, offer persistence/mapping decisions, multiple product-type coverage, and eventual safe production publishing.

### Meesho current state

No provider-specific Meesho implementation is claimed.

Blocked by:
- no authoritative partner/API contract;
- no verified authentication/publish contract;
- no authorized test access.

Do not invent endpoints or credentials. Continue provider-neutral architecture work until external evidence is available.

## 5. Marketing / AI current state

### Creator
Recent hardening:
- Creator can be grounded in selected product/offer/content-item/campaign context;
- campaign strategy context is preserved;
- malformed AI output fails closed;
- validation errors are explicit;
- AI copy/channel variants require human review before persistence.

### Strategist
Recommendation layer remains grounded in business context and observed information. It should not silently publish or invent business outcomes.

### Generate My Week
Weekly plans are reviewable execution drafts. Approval persists plan/campaign/content state but does not automatically publish.

Weekly planning now carries:
- optimizer rationale;
- observed evidence;
- experiment provenance;
- deterministic experiment disposition (`measure`, `refine`, `retest`);
- learning-oriented context.

### Optimizer / experiments
Recent work added:
- evidence-ranked opportunities and experiments;
- deterministic learning signals;
- experiment dispositions based on historical direction;
- completed-experiment direction in ranking;
- provenance surfaced into experiment/weekly-plan workflows;
- rationale/evidence shown to the user.

The optimizer must continue to distinguish observed outcomes from causal claims.

## 6. Current priority roadmap

### P0 — Reliability and verification

- [ ] Obtain/observe a current CI run and resolve any test/type/lint/build failures.
- [ ] Run relevant Vitest suites locally or through observable CI.
- [ ] Verify provider-neutral dispatch for WooCommerce and Flipkart without bypassing adapters.
- [ ] Controlled WooCommerce provider verification.
- [ ] Controlled Flipkart sandbox/provider verification with authoritative response-shape evidence.
- [ ] Verify publish-operation state transitions, idempotency replay/conflict handling and reconciliation persistence.
- [ ] Review tenant ownership and credential boundaries across all commerce mutations.
- [ ] Verify marketing review gates and grounded Creator behavior end-to-end.
- [ ] Verify weekly optimizer evidence/disposition flows against actual persisted records.
- [ ] Keep live provider mutation disabled until controlled verification passes.

### P1 — Commerce production hardening

- [ ] Provider-neutral sync operation implementation where needed.
- [ ] Durable listing/variant/external-ID mapping across providers.
- [ ] Explicit lifecycle state machine and reconciliation policy.
- [ ] Retry/backoff rules for provider failures.
- [ ] Inventory/price synchronization boundaries.
- [ ] Operational audit events and observability.
- [ ] Channel credential rotation/revocation verification.
- [ ] Concurrency/database constraint review.
- [ ] Provider-specific sandbox/live verification.

### P1 — Amazon completion

- [ ] Broaden catalog matching regression coverage.
- [ ] Verify multiple Amazon product types and complex conditional schema branches.
- [ ] Add identity/payload-builder regression tests for identifier cases.
- [ ] Define durable representation of matched-ASIN vs new-product paths.
- [ ] Complete offer mapping from canonical Variant/Inventory.
- [ ] Define which offer state is persisted versus derived.
- [ ] Only then plan safe live publishing/update/reconciliation.

### P1 — Marketing V1 reliability

- [ ] Verify complete merchant path from Business Brain → Generate My Week → review → approval → Creator → channel variant → publish/schedule → customer action → Business Impact → optimizer.
- [ ] Verify AI review cannot be bypassed by alternate API paths.
- [ ] Verify malformed model output never persists invalid content.
- [ ] Verify attribution remains explicit and evidence-based.
- [ ] Verify experiment provenance/disposition remains attached through approval and future optimization.
- [ ] Add regression coverage for critical weekly-plan/optimizer paths.

### P2 — Product operations

- [ ] Provider-neutral listing management UI.
- [ ] Channel health views.
- [ ] Listing error/retry UI.
- [ ] Bulk commerce workflows with safeguards.
- [ ] Mapping review UI.
- [ ] Structured operational observability.
- [ ] Role/permission review for high-impact actions.

### P3 — Expansion

- [ ] Meesho only after authoritative external contract/access.
- [ ] Additional commerce providers.
- [ ] Broader orders/fulfillment/returns/payments/refunds/analytics/automation.
- [ ] Advanced AI commerce workflows.

## 7. Verification ledger

### Verified / observed evidence

- Historical Amazon OAuth/LWA, product-type discovery, schema retrieval, validation-preview and seller-identity flows were exercised.
- Historical Amazon PR builds were reported passing by the user.
- WooCommerce and Flipkart focused regression tests have been added in-repository.
- Current source inspection confirms provider-neutral dispatch and guarded provider mutation.
- Flipkart reconciliation now requires provider lookup evidence before success.
- Flipkart successful idempotency replay is prevented from executing a second provider mutation.
- AI Creator review/grounding and optimizer evidence/disposition changes are represented in the current source.

### Not yet verified in the current environment

- A fresh green repository-wide CI run for the latest commit.
- Current build/lint/type-check execution.
- Live/controlled WooCommerce mutation.
- Live/controlled Flipkart mutation and authoritative response parsing.
- End-to-end marketing workflow against production-like persisted data.
- Amazon catalog matching/offer flow across representative product types.
- Full production readiness of any new provider.

**Rule:** source inspection and committed tests are not equivalent to runtime/provider verification.

## 8. Known risks / blockers

1. **CI evidence gap:** latest repository changes need an observable quality result.
2. **Provider verification gap:** WooCommerce and Flipkart mutation/response behavior needs controlled verification.
3. **Provider-state ambiguity:** network/provider timeouts must reconcile rather than blindly retry.
4. **Amazon schema variability:** complex conditional JSON Schema needs broader regression coverage.
5. **AI output risk:** review gates and fail-closed parsing must remain enforced on every persistence path.
6. **Attribution risk:** observed outcomes must not be represented as causal proof.
7. **Meesho external-contract blocker:** no implementation until authoritative provider evidence exists.
8. **Payment/refund production audit:** deferred and separate from current commerce work.

## 9. Payment / refund audit — deferred

The separate September audit recorded a successful refund retry scenario, including failed attempt preservation, new idempotency key, successful Razorpay retry, payment state sync, return completion and inventory restock.

That is historical validation, not production certification.

Still deferred:
- webhook duplicates/out-of-order events;
- ambiguous provider timeouts;
- reconciliation;
- concurrency/idempotency edge cases;
- authorization/security/webhook signatures;
- operational alerting/support visibility;
- test-data cleanup.

Do not restart this audit opportunistically. Resume before payment/refund is declared production-ready.

## 10. Launch gates

Dizito V1 is not declared production-ready solely because features exist.

Relevant launch gates:
- complete merchant-facing workflow;
- authentication/tenant ownership;
- encrypted credentials;
- safe failure persistence/surfacing;
- idempotency and duplicate prevention;
- reconciliation for ambiguous provider outcomes;
- database consistency;
- build/type/lint/tests;
- controlled provider verification;
- AI review and grounding safeguards;
- documentation of limitations.

## 11. Current recommended next step

**Do not start another large feature.**

First establish runtime truth:
1. obtain the latest CI quality result;
2. run/fix focused tests and type/lint/build failures;
3. controlled-verify WooCommerce and Flipkart provider boundaries;
4. verify marketing review/optimizer end-to-end;
5. then return to the highest remaining production blocker.

Amazon catalog/offer work remains important, but it should proceed as part of the same reliability discipline rather than as an isolated feature race.

## 12. Persistent documentation rules

When meaningful implementation changes:
- update this file;
- append a dated entry to `docs/IMPLEMENTATION_LOG.md`;
- keep `docs/DIZITO_CODEX_PROJECT_CONTEXT.md` aligned with durable architecture/current state;
- never claim verification without evidence.

## 13. Long-term roadmap

1. Canonical catalog.
2. Provider-neutral channel/listing layer.
3. Shopify foundation.
4. Amazon product-content foundation.
5. Amazon catalog/offer completion.
6. WooCommerce + Flipkart production-grade provider operations.
7. Durable publishing/reconciliation across providers.
8. AI marketing flywheel reliability.
9. Additional commerce providers, including Meesho when contract/access is available.
10. Broader commerce operations and AI-assisted commerce workflows.

## 14. Open architectural questions

1. Exact provider-neutral listing lifecycle states and legal transitions.
2. Durable mapping strategy for external product/listing/variant identities.
3. Which provider operations should be synchronous versus queued.
4. Amazon matched-ASIN vs new-product persistence semantics.
5. Amazon offer persistence vs canonical derivation.
6. Representative Amazon schema regression suite.
7. Meesho integration contract once authoritative access is available.
8. Operational observability and support tooling for ambiguous provider mutations.

## 15. Latest implementation checkpoint

As of `898317777d5aee193022452da45411648dd926ba`:
- Flipkart publish confirmation bypass was removed and reconciliation is the intended success-confirmation path.
- Flipkart live mutation remains fail-closed.
- Flipkart route/provider/idempotency/reconciliation regression coverage has been added.
- WooCommerce operations have been moved toward shared provider dispatch.
- AI Creator grounding/review/fail-closed behavior has been hardened.
- Optimizer evidence, experiment disposition and provenance are carried into weekly planning.
- Social reconnect/status/disconnected-target fixes have landed.

No new provider should be considered production-ready until runtime/provider verification is recorded.


## 16. Latest post-consolidation changes

After the main repository checkpoint used for this refresh, the current head also contains:
- `ee24383a78bfda2c3e03f65d60eb84849b65bb42` — publish success now requires a non-empty confirmed external ID and persists it explicitly.
- `c0e6b8ed4c760208adb6b537480e31549e8d8b34` — publish-operation lifecycle regression tests.
- `f3bda849a663a5dde97ec076051cf6daa0e3e2f2` — Flipkart client contract tests.
- `bb01a2701ebf5df54d67386e2f8a371216b2d74c` — documentation of the Flipkart provider verification seam.

These strengthen the safety boundary but do not constitute live provider verification or a green repository-wide quality result.

### Commerce code-level hardening continuation — 2026-10-06
- Publish idempotency reservations are now race-safe with atomic conflict handling; duplicate concurrent requests resolve to the existing operation instead of surfacing a unique-constraint failure.
- Idempotency keys are explicitly bound to listing/provider/operation type and validated against storage bounds.
- WooCommerce provider mutation success remains reconciliation-safe if post-mutation persistence fails; the attempt is kept ambiguous rather than failed to prevent duplicate creation.
- WooCommerce publish API now returns HTTP 202 with explicit ambiguous/reconciliation-required state instead of presenting provider submission as a normal 201 success.
- WooCommerce reconciliation-status reads are scoped to the WooCommerce provider channel and authenticated tenant.

### Commerce code-level hardening continuation — Shopify tenant boundary — 2026-10-06
- Shopify GraphQL access now resolves the channel through authenticated tenant-scoped channel lookup rather than an unscoped internal channel lookup.
- Shopify publish/sync provider calls now carry authenticated user context into the provider client and credential access path.
- Shopify connect/callback and Commerce channel listing routes now validate authenticated user IDs as safe positive integers before database/provider work.

### Commerce tenant-integrity and canonical fingerprint hardening — 2026-10-06
- Added PostgreSQL tenant-integrity constraints linking commerce listings and publish ledgers back to their owning channel/listing tenant. Legacy rows remain reviewable because the new composite foreign keys are NOT VALID, while new writes are enforced.
- Publish idempotency fingerprints now use canonical object-key ordering, preventing semantically identical JSON payloads with different key order from producing different fingerprints.

### WooCommerce lifecycle state-machine hardening — 2026-10-06
- Corrected the WooCommerce post-provider listing persistence parameter binding so a successful remote mutation cannot be recorded against the wrong database row.
- Reconciliation now rejects conflicting existing external IDs and provider-mismatched durable attempts, and the final listing update only succeeds when the existing external ID is null or matches the provider-confirmed ID.

### Provider adapter outcome normalization — 2026-10-06
- WooCommerce adapter now checks reconciliation-required outcomes before generic error normalization, preserving ambiguous publish state and preventing accidental retry classification.
- Flipkart publish adapter outcomes are normalized so disabled/not-found/failed states cannot be mistaken for reconciliation success.

### Flipkart reconciliation state-consistency hardening — 2026-10-06
- Flipkart reconciliation now validates the tenant/listing/provider-bound publish operation before performing provider read-back.
- Confirmed publish success now atomically persists both the provider-neutral publish operation and the product listing external identity/synced state.
- Conflicting existing listing external IDs are rejected instead of overwritten.
- Flipkart adapter reconciliation errors are normalized into deterministic failed vs retryable ambiguous outcomes.
- Fixed the WooCommerce reconciliation POST route to derive and validate the authenticated tenant user ID correctly.
### Commerce provider-entry audit — 2026-10-06
- Fixed a remaining WooCommerce publish-route tenant identity bug that used a self-referential `userId` assignment.
- Tenant-scoped Shopify credential reads/writes now require authenticated user context and verify the channel belongs to that tenant/provider.
- Shopify GraphQL shop lookup now requires explicit tenant context.
- Shopify callback and token-refresh paths pass authenticated tenant identity into credential persistence.


### Commerce credential and provider-client tenant hardening — 2026-10-06
- Flipkart credential persistence now requires authenticated tenant identity and verifies the channel belongs to that tenant and provider; OAuth callback and refresh rotation pass the tenant ID through.
- Flipkart publish ambiguity now maps to HTTP 202, while confirmed/idempotent outcomes use explicit 201/200 semantics.
- Amazon credential save/read now requires tenant identity and verifies the channel/provider; Amazon SP-API client entry points now require explicit tenant context rather than unscoped internal channel resolution.
- Amazon product-type discovery and connection verification propagate the authenticated tenant context into provider calls.
- No tests, lint, build, or live provider verification have been run in this code-level pass; verification remains intentionally deferred until implementation work is complete.


### Commerce live-publish safety continuation — 2026-10-06
- The legacy Shopify direct publish path now requires explicit live-publish confirmation at both API and publisher boundaries; missing confirmation fails closed with a conflict response.
- Shopify remains a legacy direct provider path and is not yet moved into the shared durable publish ledger; its idempotency/durable-operation architecture remains a follow-up hardening item rather than being silently treated as equivalent to Flipkart/WooCommerce.


### Shopify publish concurrency hardening — 2026-10-06
- Legacy Shopify publish now acquires a PostgreSQL advisory lock keyed by tenant, channel, and product for the full remote-create/persistence lifecycle.
- This prevents concurrent requests for the same listing from both observing a missing external ID and issuing duplicate Shopify productCreate mutations.
- The lock deliberately does not claim to provide a Shopify-native idempotency contract; crash/retry reconciliation remains a future durability improvement.


### Shopify deterministic crash recovery — 2026-10-06
- Shopify product creation now writes a `dizito.listing_id` metafield marker during `productCreate`, using the canonical Dizito listing ID as the recovery identity. Shopify supports product-create metafields and product search by metafield value.
- Before issuing a new create, the publisher searches for that exact marker. One match is adopted and routed through the existing Shopify sync/reconciliation flow; multiple matches fail closed rather than guessing.
- Variant recovery handles the specific partial-create case where Shopify has exactly one existing variant and Dizito has no saved variant mappings, binding that sole provider variant to the canonical first variant instead of creating a duplicate.
- Existing orphan products created before this marker was introduced are intentionally not heuristically claimed.


### Amazon SP-API tenant propagation — 2026-10-06
- Completed tenant-context propagation through Amazon catalog search, catalog identity resolution, listing validation preview, offer validation preview, product-type definition retrieval, and connection verification.
- Amazon credential persistence in the OAuth callback now explicitly binds the credential write to the authenticated user.
- All Commerce-facing Amazon SP-API helper paths now require and forward authenticated `userId`; provider access no longer relies on channel ID alone.
- Runtime tests remain intentionally deferred until the implementation pass is complete.


### Commerce channel identity concurrency — 2026-10-06
- Added a database-level unique identity for `(user_id, provider, external_account_id)` when an external account ID exists.
- Hardened `createCommerceChannel` to treat a uniqueness race as an existing channel rather than creating a duplicate.
- This closes the OAuth reconnect “find then create” race for Shopify, Amazon, and Flipkart channel identities.
- Tests/lint/build remain deferred until the complete code-level implementation pass is finished.


### WooCommerce ambiguous publish/reconciliation contract — 2026-10-06
- Preserved ambiguous outcomes from remote mutation failures and post-provider persistence failures instead of surfacing them as generic provider failures.
- WooCommerce adapter normalization now maps reconciliation-required publish results to `status=ambiguous`.
- WooCommerce reconciliation provider-read/persistence uncertainty is also exposed as `status=ambiguous` and the API returns HTTP 202 for that state.
- Existing deterministic validation/not-found outcomes remain failed with their prior error semantics.


### Commerce channel authorization/update hardening — 2026-10-06
- Removed the unused unscoped `getCommerceChannelByIdInternal` helper so provider code cannot accidentally bypass tenant-scoped channel lookup.
- `updateCommerceChannel` now locks the tenant-owned channel row inside a transaction before merging metadata, preventing concurrent reconnect/update operations from losing metadata fields.
- Shopify and Amazon credential tables already use channel foreign keys and one-to-one channel uniqueness; application reads/writes remain tenant/provider scoped.


### Commerce listing + route boundary hardening — 2026-10-06
- Hardened product-listing sync-state writes with a tenant-scoped transaction and row lock so concurrent updates merge provider metadata instead of replacing it.
- Added deterministic listing external-ID conflict detection during sync-state persistence.
- Hardened listing-variant upserts and draft saves to preserve omitted external IDs, merge provider metadata, and reject duplicate external IDs within a listing.
- Fixed Commerce listing/channel route session-ID defects and standardized positive safe-integer validation across Commerce API boundaries, including Amazon, WooCommerce, Shopify, Flipkart, and channel routes.
- Serialized shared Commerce publish external-ID adoption with a tenant/channel/external-ID advisory lock before reconciliation commits the remote identity.
- No tests, lint, build, or live provider verification have been run; verification remains intentionally deferred until the code-level implementation pass is complete.


### Commerce sync lease hardening — 2026-10-06
- Added durable product_listings.sync_claim_token leases so a worker that loses/relinquishes a stale 10-minute sync claim cannot later overwrite the newer worker's result.
- Shopify sync now carries the claim token through both success and failure persistence; stale workers fail closed instead of mutating listing state.
- Migration 019_product_listing_sync_claims.sql adds the claim-token column and supporting index.
- Tests, lint, build, and provider verification remain intentionally deferred.


### Legacy Commerce listing/media boundary hardening — 2026-10-06
- Hardened legacy product-listing API session IDs to require positive safe integers.
- Listing media mappings now preserve omitted external IDs and merge provider metadata instead of clearing/replacing existing mapping state.
- Added deterministic duplicate media external-ID conflict detection within a listing.
- Legacy variant API now preserves omitted external IDs and exposes deterministic conflict responses.
- Tests, lint, build, and provider verification remain intentionally deferred.
