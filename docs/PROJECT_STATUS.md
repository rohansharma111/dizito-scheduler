# Dizito Project Status & Roadmap

**Last updated:** 2026-10-06  
**Repository:** `rohansharma111/dizito-scheduler`  
**Default branch:** `main`  
**Latest observed commit:** `421c1c03c2074e0ed4340aed9ba98ad69eb8a9e3`  
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
