# Dizito Project Status & Roadmap

**Last updated:** 2026-10-07  
**Repository:** `rohansharma111/dizito-scheduler`  
**Default branch:** `main`  
**Latest observed commit:** `84c325f0e0f39e58e8caf8d99c047b6bfe3a5be1`  
**Project:** Dizito — AI Commerce Operating System

> This is the canonical working status document. Repository code/schema and observed verification are authoritative. “Implemented” does not mean “verified,” and “verified” does not mean “production-ready.”

## 1. Current phase

**2026-10-07 validation checkpoint**

- Sequential TypeScript/build repair pass is complete; the latest `main` commit has a successful Vercel status.
- The repository quality workflow remains configured as **test → lint → build**.
- No fresh GitHub Actions run is exposed for the latest direct push, so test/lint success is not claimed.
- `merge/meesho-into-main` is 635 commits behind `main` and 0 ahead; it contains no unmerged changes relative to current `main`.


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


### Marketing V1 UI + Design System — Workstream A checkpoint (2026-10-07)

- Branch `v1/marketing-ui-design` is 0 commits behind current `main` at workstream start and contains only UI/design-system changes.
- Reusable Dizito visual primitives now live in `components/dizito/DizitoUI.tsx`; global tokens and responsive visual rules live in `app/globals.css`.
- Protected navigation now exposes the intended merchant loop: Business Brain → AI Strategist → Generate My Week → Content Review → Optimizer, alongside Media, Channels & Accounts and Business Impact.
- A dedicated Business Brain read surface was added using the existing tenant-scoped `/api/marketing/business-brain` contract. No business-brain persistence or API behavior was changed.
- Dashboard, setup, weekly planning, strategist, content review, media, accounts, Business Impact, optimizer and billing presentation were refreshed without changing billing logic, provider adapters, commerce architecture, media provider implementation or database schema.
- Verification boundary: source/diff inspection completed; no fresh GitHub Actions run exists for the branch, so overall test/lint/build green status remains unclaimed. No external provider/runtime verification was performed.
- Remaining UI work: detailed product/offer/service editing surfaces, final scheduling edge-state polish, deeper mobile interaction QA and browser-level end-to-end verification.

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

### Meta / Facebook + Instagram connection status — 2026-10-07

- Meta Facebook Login for Business remains the canonical Dizito connection flow.
- The developer/admin Meta account was previously able to complete the flow, while an external account exposed the business-scoped Page discovery gap; developer-role success is therefore not treated as proof that external customer authorization is complete.
- Current implementation keeps `/me/accounts` as the primary Page discovery path and adds a fallback to `/me/assigned_pages` for business-scoped users whose Pages are assigned through a Business Portfolio.
- Meta Graph/Login URLs are being migrated from the repository's legacy `v19.0` references to current `v26.0`.
- The Instagram permissions `instagram_basic` and `instagram_content_publish` are approved according to the current Meta App Review state observed during development.
- Tech Provider / Access Verification remains an external Meta verification prerequisite for customer accounts and must be separately verified before production readiness is claimed.
- Business Portfolio Page discovery may additionally require `business_management` access in the Facebook Login for Business configuration; this is a Meta configuration/App Review item, not something the repository can grant itself.
- Hard-coded Meta access-token debug routes were removed from the active application surface.
- Runtime Meta customer-account verification remains pending.

### Pinterest current access status — 2026-10-07

- Pinterest **Standard Access has been granted** for Dizito.
- The Pinterest integration is now authorized to publish Pins publicly through the approved API access level.
- This replaces the previous Standard Access application/pending-access blocker.
- This records provider access authorization; it does **not** by itself claim that an end-to-end live Pin publication has been runtime-verified from the current application build.

### Google Business Profile API access — 2026-10-07

- Dizito met the prerequisites for Google Business Profile API access and submitted the current Google **Basic API Access** application.
- Google Cloud project number submitted: `250265818721`.
- Company website submitted: `https://www.dizito.in/`.
- The application was submitted as a customer-authorized SaaS use case: Dizito will allow authorized customers to connect and manage their own Google Business Profiles through Google's OAuth flow.
- The application reported that the project was **not already allowlisted**, consistent with the Google Cloud quota showing `0` requests/minute before approval.
- Google opened support case **`0-3242000041809`** and reported an approximate review time of **7–10 business days**.
- **Current status: pending Google allowlisting/approval.**
- The current `0` quota is therefore documented as the pre-approval state, not as a failed integration.
- Do not create a second project or submit a duplicate application while this case is pending.
- Provider access approval will still be separate from runtime verification of Dizito's OAuth, location discovery, and post-publishing flow.

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

### Pinterest provider-access verification — 2026-10-07

- User-confirmed external provider status: Pinterest Standard Access has been granted.
- Public Pin publishing is now authorized by Pinterest for the Dizito integration.
- End-to-end live Pin publication from the current application build remains a separate runtime verification item.


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


### Commerce route-entry audit — 2026-10-06
- Audited remaining Commerce publish/draft/reconcile/connect/sync route entry points against the tenant-bound provider architecture.
- Confirmed Flipkart and WooCommerce publish/reconcile routes dispatch through the shared provider service with safe positive user IDs.
- Confirmed Flipkart OAuth state is bound to the authenticated tenant and credentials are saved with tenant context.
- Confirmed WooCommerce connect verifies the store before channel creation and persists credentials tenant-scoped.
- Confirmed Shopify remains on its separate durable publish/recovery path rather than being forced into the provider-neutral ledger.
- Removed redundant duplicate authenticated-user validation from Shopify publish/sync routes.
- Tests, lint, build, and live provider verification remain intentionally deferred.


### Commerce credential provider-boundary hardening — 2026-10-06
- Hardened WooCommerce credential persistence and reads to require both tenant ownership and `provider='woocommerce'`.
- Re-audited all Commerce credential modules: Shopify, Amazon, Flipkart, and WooCommerce now require tenant context; provider identity is explicitly checked at each provider-specific credential boundary.
- No tests/lint/build/live provider verification performed yet.


### Sync claim-token regression fix — 2026-10-06
- Corrected `claimProductListingSync()` so the generated `sync_claim_token` is returned from PostgreSQL and handed to the worker.
- This restores the intended lease protocol: the worker receives the exact token required by `updateProductListingSyncState()` and stale workers remain unable to commit state.
- Tests/lint/build remain deferred.


### Commerce draft creation race hardening — 2026-10-06
- Hardened `upsertProductListingDraft()` against concurrent first-time listing creation.
- If the database unique constraint wins a creation race, the transaction now resolves and locks the authoritative existing listing rather than surfacing a raw `23505` error.
- Existing-listing draft updates continue to use row locking and provider metadata merging.
- Validation remains deferred.


### Commerce draft race transaction correction — 2026-10-06
- Corrected the concurrent draft-creation recovery to use a PostgreSQL savepoint around the attempted insert.
- A `23505` no longer leaves the outer transaction aborted before resolving the authoritative listing row.
- Non-unique insertion failures are rolled back to the savepoint and rethrown; successful inserts release the savepoint normally.
- Validation remains deferred.


### Commerce listing-media concurrency hardening — 2026-10-06
- Hardened `upsertProductListingMedia` with a tenant/provider-aware listing lock and transaction.
- Existing media mappings are locked before merge; external-ID conflict checks now execute under the same transaction.
- This prevents concurrent media workers from both passing the conflict check and creating conflicting mappings.
- Validation remains deferred until the implementation pass is complete.


### Commerce sync external-ID race hardening — 2026-10-06
- `updateProductListingSyncState` now acquires the tenant/channel/external-ID advisory lock before checking for conflicting listings.
- This closes the cross-listing race where two concurrent sync workers could otherwise assign the same provider external ID to different listings.


### Commerce mapping external-ID normalization — 2026-10-07
- Variant and draft mapping paths now normalize blank/whitespace-only provider external IDs to `NULL`.
- This aligns mapping persistence with publish reconciliation semantics, where blank external IDs are treated as absent.
- Media mapping normalization remains the next small consistency patch before validation.


### Commerce reconciliation/race hardening — 2026-10-07
- Completed external-ID normalization across listing sync-state, draft variant, listing variant, and listing media persistence; blank/whitespace-only IDs are stored as NULL.
- Hardened WooCommerce reconciliation with a tenant/channel/external-ID advisory lock, locked listing validation, and cross-listing external-ID conflict detection before marking a provider product reconciled.
- Hardened WooCommerce idempotent replay with the same external-ID serialization/conflict protection before restoring a listing to synced/active.
- updateCommerceChannel now converts a database uniqueness collision on provider/account identity into the deterministic CHANNEL_IDENTITY_CONFLICT result.
- Legacy product-listing variant API user validation now requires a positive safe integer, matching the Commerce route boundary standard.
- Tests, lint, build, and live provider verification remain intentionally deferred until the implementation pass is complete.
\n\n### Marketing execution provenance — 2026-10-07\n- Added durable Variant → Post provenance by extending `marketing_content_item_posts` with `variant_id` and a same-Content-Item composite foreign key.\n- Content Item → Post conversion now persists the exact selected channel variant.\n- Manual attribution now validates Variant → Post provenance when a post and variant are both supplied.\n- Legacy Content Item → Post mappings remain compatible with NULL variant provenance.\n- Tests, lint, build, database execution, and provider verification remain intentionally deferred until the code-level implementation pass is complete.\n

### Commerce provider-adapter outcome hardening — 2026-10-07
- Removed an unreachable duplicate WooCommerce adapter ambiguity branch so publish outcome mapping has one authoritative reconciliation-required path.
- Flipkart reconciliation now treats deterministic LISTING_EXTERNAL_ID_CONFLICT as a failed reconciliation outcome rather than ambiguous provider uncertainty.
- Direct Commerce listing/mapping write-path audit found no additional application-level INSERT/UPDATE paths outside the hardened listing services.
- Tests, lint, build, and live provider verification remain intentionally deferred.
\n\n### Marketing attribution detail propagation — 2026-10-07\n- Business Impact now preserves attribution detail at Content Item, Variant, and Post levels instead of exposing only campaign-level attribution.\n- Marketing Optimizer opportunities now carry explicit attributed outcome evidence and include it in deterministic evidence scoring.\n- Existing campaign-level attribution output remains backward compatible.\n- Observed outcomes and manual attribution remain explicitly separated; neither is treated as causal evidence.\n- Tests, lint, build, database execution, and provider verification remain intentionally deferred.\n

### Commerce publish-ledger outcome hardening — 2026-10-07
- Provider-neutral publish reconciliation now distinguishes a listing's existing external-ID mismatch from a deterministic cross-listing external-ID conflict.
- Flipkart adapter classification maps the cross-listing conflict to a failed reconciliation outcome instead of ambiguous provider uncertainty.
- Database schema review found no safe incremental composite tenant FK for listing variants/media because those child tables do not carry user_id; their parent listing ownership plus application-level canonical variant/media ownership checks remain the current design.
- A redundant migration was deliberately removed rather than adding schema churn without a real tenant key.
- Tests, lint, build, and live provider verification remain intentionally deferred.


### Marketing provenance consumer hardening — 2026-10-07
- Legacy manual Content Item → Post linking now preserves optional Variant → Post provenance with ownership/platform validation.
- Content Item APIs expose both legacy postIds and durable postLinks with variant identity.
- Optimizer API/UI now carry and distinguish explicit attributed evidence from observed evidence.
- Runtime/test/build/database verification remains intentionally deferred until the code-level implementation pass is complete.


- Legacy Content Item → Post links can now be enriched with Variant provenance without overwriting an already-established Variant → Post relationship.


### WooCommerce channel-client boundary hardening — 2026-10-07
- Restored the tenant-scoped `getWooCommerceChannelConfig` boundary used by WooCommerce publish/reconcile.
- The boundary now requires the channel to exist for the authenticated tenant, have provider `woocommerce`, remain `active`, contain a configured store URL, and have tenant-scoped credentials before constructing the remote client config.
- Tests, lint, build, and live provider verification remain intentionally deferred.


## 14. V1 Beta launch checkpoint — 2026-10-07

The project is now explicitly transitioning from feature accumulation to **V1 Beta completion + production hardening + distinctive Dizito product design**.

### V1 definition
A V1 merchant must be able to complete:
Business setup → Business Brain → products/services/offers/media → channel connection → Strategist → Generate My Week → review/edit → approval → platform-specific content → schedule/publish → Customer Actions → Business Impact → Optimizer → next week.

V1 does **not** require every marketplace provider to be production-ready.

### New P0 launch priorities
- complete the marketing merchant journey in UI;
- create a distinctive Dizito design system and redesign the main V1 surfaces;
- redesign subscription/pricing around the current AI marketing + commerce product;
- complete a security/tenant-isolation audit;
- make video a first-class, platform-capability-driven media type;
- complete external Meta/Pinterest/Google/provider verification where required;
- establish fresh CI/test/lint/build evidence;
- complete beta onboarding and failure/recovery UX.

### External status
- Meta `business_management` App Review: **in progress**. This is specifically related to Business Portfolio-managed Page discovery for external customers. Approval must not be assumed.
- Pinterest Standard Access: **granted**. This clears the previous access blocker; live end-to-end publication from the current build remains a separate verification item.
- Google Business Profile API: **application still required**; implement in parallel and do not claim access before approval.
- Meesho: remains blocked by authoritative API/partner access.

### Media/video direction
Current media infrastructure already has video-aware upload/storage foundations, but publisher implementations remain predominantly image-oriented. Do not equate video upload with video publishing.

Future architecture:
Media asset → platform capability resolver → platform-specific preparation/upload/process/poll → provider publish → confirmed external ID → reconciliation.

Large video uploads should move toward direct/signed Cloudinary upload rather than buffering the entire file through the application API.

### Pricing/subscription direction
The historical Creator/Agency model is too closely coupled to the old social scheduler. V1 should use:
Billing Plan → Entitlements → Subscription → Provider Mapping → Usage.

Planning prices:
- Free;
- Growth ~₹799/month;
- Pro ~₹1,999/month;
- Agency ~₹4,999+/month;
- founding beta ~₹499/month.

These are product hypotheses and must be validated against costs and willingness to pay.

### Infrastructure/database checkpoint
Current Neon observation:
- approximately 12 MB database;
- 46 public tables;
- 156 public indexes;
- current row counts are tiny.

No database or hosting migration is currently justified. Main future scale concern is event/log/query growth, not current storage. Add observability and retention before considering partitioning or a database migration.

Current stack remains appropriate for beta:
GitHub + Vercel + Neon + Cloudinary + Razorpay + provider APIs.

### Security checkpoint
Do not claim Dizito is fully secure yet. The credential-bearing schema and provider integrations require verification of the actual encryption/read/write paths, tenant isolation, OAuth/webhook security, rate limiting, upload validation, log sanitization and dependency/platform configuration.

### Documentation
New canonical planning documents:
- `docs/DIZITO_V1_LAUNCH_PLAN.md`;
- `docs/DIZITO_SECURITY_V1_CHECKLIST.md`;
- `docs/DIZITO_PROVIDER_VERIFICATION.md`;
- `docs/DIZITO_PARALLEL_WORKSTREAMS.md`.

These define the launch gates and the multi-chat ownership model.

### Workstream A UI continuation — 2026-10-08
- Audited the merchant-context APIs before extending the UI: Goals and Offers currently support GET/POST only; no Services API exists under `app/api/marketing`.
- No unsupported Services CRUD or Goal/Offer edit/delete UX was added.
- Fixed the Product Edit loading/not-found state markup and aligned Generate My Week with the reusable Dizito design system while preserving existing generation/approval behavior.
- Verification remains source-level only; no fresh build/lint/test/browser run is claimed.


### Workstream A distribution UI continuation — 2026-10-08
- Standardized Marketing Content, Posts, Drafts and Calendar around shared Dizito page/header/card/state primitives.
- Added explicit loading, empty and API-error recovery states without changing publishing/scheduling APIs.
- No database, billing, provider-adapter, commerce or media-provider changes. Verification remains source-level only.


### 2026-10-08 — Workstream A UI consistency continuation
- Merchant-facing Accounts and Activity surfaces received Dizito design-system alignment and mobile interaction polish.
- Accounts retains existing platform connection/reconnection contracts and plan-limit behavior.
- Activity retains existing event loading, filtering, grouping, and payload inspection behavior.
- Analytics and other legacy merchant surfaces remain candidates for later visual consistency passes; this workstream does not claim browser/build verification.
