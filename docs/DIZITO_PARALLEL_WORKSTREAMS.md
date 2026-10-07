# Dizito Parallel Development Workstreams

**Status:** Active multi-chat execution plan  
**Last updated:** 2026-10-07

> This document defines how multiple ChatGPT/Codex development chats can work simultaneously without stepping on each other. The repository is the source of truth. Each workstream has an explicit ownership boundary. Do not modify another workstream's owned files unless the task explicitly requires a coordinated change.

## 1. Global rules for every workstream

Every chat must begin by:
1. reading `AGENTS.md`;
2. reading `docs/PROJECT_STATUS.md`;
3. reading `docs/IMPLEMENTATION_LOG.md`;
4. reading `docs/DIZITO_CODEX_PROJECT_CONTEXT.md`;
5. reading this file;
6. inspecting current branch/head and recent commits;
7. reconciling the task against actual code before editing.

Every chat must:
- create/use its own branch;
- avoid direct edits to another workstream's files;
- avoid changing shared documentation while implementation is actively being done unless the workstream owns that documentation update;
- run focused tests;
- report exact verification;
- update its owned log/status section when complete;
- never claim provider/runtime verification without evidence.

Do not merge another workstream's branch automatically.

## 2. Workstream A — Marketing V1 UI + Design System

**Goal:** make Dizito feel like a distinctive AI business operating system and complete the merchant-facing marketing journey.

**Owns primarily:**
- `app/(protected)/...` marketing pages;
- `components/... ` marketing/design components;
- `app/globals.css`;
- design-system-specific components;
- UI tests.

**Does not own:**
- billing backend;
- provider adapters;
- database migrations unrelated to UI;
- media provider implementation.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM A: MARKETING V1 UI + DIZITO DESIGN SYSTEM

Read AGENTS.md, docs/PROJECT_STATUS.md, docs/IMPLEMENTATION_LOG.md, docs/DIZITO_CODEX_PROJECT_CONTEXT.md, docs/DIZITO_V1_LAUNCH_PLAN.md and docs/DIZITO_PARALLEL_WORKSTREAMS.md.

Goal: make the marketing layer fully usable for V1 Beta and give Dizito a distinctive visual identity.

Inspect the current repository first. Do not restart completed backend work.

Own primarily:
- marketing protected pages/components;
- global visual system;
- reusable Dizito UI primitives;
- responsive/mobile behavior;
- loading/empty/error/success/disconnected/plan-limit states.

Implement:
1. audit the complete merchant journey;
2. establish a reusable Dizito design system;
3. redesign dashboard/Business Brain/Generate My Week/content review/media/accounts/Business Impact/billing surfaces as appropriate;
4. preserve existing API/backend contracts unless a real UI blocker requires a small backend change;
5. make AI feel like the intelligence layer of Dizito, not a chatbot add-on;
6. add focused UI tests where practical.

Do NOT modify subscription business logic, provider adapters, or unrelated commerce systems.

Before finishing:
- run focused tests/type checks/build as available;
- inspect the diff;
- document exact verification;
- if the chat is nearing its limit, STOP implementing and give the user a continuation handover containing branch, commit, files changed, completed work, tests, failures, decisions, and exact next step.

If this workstream is complete, report remaining V1 UI gaps instead of inventing more features.
```

## 3. Workstream B — Subscription, Pricing + Entitlements

**Goal:** replace the historical social-scheduler billing model with the V1 Dizito product model.

**Owns primarily:**
- `lib/billing/**`;
- billing/subscription API routes;
- billing database migrations;
- billing UI/settings;
- pricing configuration;
- billing tests.

**Does not own:**
- general marketing UI redesign;
- provider publishing;
- media pipeline.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM B: SUBSCRIPTION + PRICING

Read all persistent docs plus docs/DIZITO_V1_LAUNCH_PLAN.md and docs/DIZITO_PARALLEL_WORKSTREAMS.md.

Audit the current billing implementation before changing anything. The current model was created for the older social publishing product.

Goal: design and implement a V1 subscription/entitlement model supporting:
- Free;
- Growth;
- Pro;
- Agency/future multi-business;
- trial;
- upgrade/downgrade;
- cancellation;
- failed payment/grace period;
- usage limits;
- AI limits;
- channel limits;
- publishing limits;
- Business Brain/Strategist/Creator/Optimizer entitlements;
- commerce entitlements;
- Razorpay provider mapping.

Do not hard-code provider plan IDs into product/business logic.

Prefer:
Billing Plan → Entitlements → Subscription → Provider Mapping → Usage.

Inspect existing DB/schema and migration conventions. Avoid a premature full workspace migration.

Implement backend + billing UI + tests. Do not redesign the global visual system; coordinate with Workstream A through existing component contracts.

Do not touch provider publishers.

At the end, document exact migration requirements, backward compatibility, test evidence and remaining Razorpay external verification.
If chat limit is near, stop and produce a full continuation handover.
```

## 4. Workstream C — Media + Video Platform Capability

**Goal:** make video a first-class media type and platform-specific publishing capability.

**Owns primarily:**
- media upload/processing code;
- media metadata/types;
- media UI where required for video;
- provider-specific video publisher modules;
- media capability contracts;
- media tests.

**Does not own:**
- general design-system redesign;
- subscription logic;
- unrelated commerce providers.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM C: VIDEO + MEDIA CAPABILITY

Read all persistent docs plus docs/DIZITO_V1_LAUNCH_PLAN.md.

Audit current media upload, Cloudinary integration, media_library schema, and every publisher before implementing.

Goal:
1. preserve image publishing;
2. make video a first-class media type;
3. introduce platform capability metadata;
4. move large-video uploads toward direct/signed Cloudinary upload;
5. validate size/MIME/content/duration/dimensions;
6. support platform-specific video workflows.

Do not treat video as image_url.

Implement capability-aware architecture for:
- Instagram/Reels;
- Facebook video;
- Pinterest video Pin;
- LinkedIn video;
- Google Business distinctions where externally supported.

For each provider, explicitly model upload/register/process/poll/publish/external-ID/reconciliation behavior.

Do not claim provider support unless the provider contract supports it.

Add tests for capability resolution and provider-specific state transitions.

Do not modify subscription or broad UI architecture except the minimum required media UI.

If external verification is unavailable, leave the capability fail-closed and document exactly what remains external.

When near chat limit, stop and produce a continuation handover with exact state.
```

## 5. Workstream D — Security + Tenant Isolation Audit

**Goal:** establish a defensible V1 security baseline.

**Owns primarily:**
- auth/security helpers;
- authorization guards;
- credential encryption boundaries;
- rate limiting;
- webhook verification;
- security tests;
- security documentation.

**Does not own:**
- broad UI redesign;
- pricing;
- provider feature additions unless required to close a security defect.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM D: SECURITY + TENANT ISOLATION

Read AGENTS.md, all persistent docs, docs/DIZITO_V1_LAUNCH_PLAN.md and docs/SECURITY_V1_CHECKLIST.md.

Do a source-level security audit before modifying anything.

Priorities:
- token/credential encryption actual implementation;
- API authorization and tenant ownership;
- OAuth state/PKCE/replay;
- webhook signatures/replay;
- upload/SSRF/file validation;
- rate limiting;
- secret/log leakage;
- AI data isolation;
- security headers/cookies;
- dependency/security configuration.

Audit every high-impact API route and provider credential boundary.

Do not perform destructive DB changes.

For every finding, classify:
P0 blocker / P1 important / P2 hardening / accepted-deferred.

Fix P0/P1 issues that can safely be fixed in this workstream and add regression tests.

Do not claim “fully secure”; report evidence and residual risk.

If a finding requires another workstream's architecture, document it and do not silently change their system.

Near chat limit: stop and provide a detailed continuation handover.
```

## 6. Workstream E — Marketing Runtime/QA + CI

**Goal:** independently verify the marketing flywheel and repository quality.

**Owns primarily:**
- tests;
- test fixtures;
- CI configuration;
- verification documentation;
- no production feature implementation unless a test exposes a defect.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM E: MARKETING QA + CI

Read all persistent docs plus docs/DIZITO_V1_LAUNCH_PLAN.md.

Do not add major features.

Audit:
Business Brain → Strategist → Generate My Week → review → approval → Creator → channel variants → schedule/publish → Customer Actions → Business Impact → Optimizer.

Run:
- TypeScript/build checks;
- lint;
- focused Vitest;
- integration tests where available.

Add missing regression tests for:
- review-gate bypass;
- malformed AI output;
- weekly approval;
- variant provenance;
- attribution distinction;
- optimizer evidence/disposition;
- tenant isolation in marketing routes.

Separate:
implemented;
test-verified;
runtime-verified;
external-provider-verified.

Do not claim overall green CI unless actually observed.

Fix only focused defects discovered by tests. Avoid broad refactors.

If chat limit is near, stop and produce a continuation handover.
```

## 7. Workstream F — External Provider Verification

**Goal:** perform provider-level testing without changing provider architecture unnecessarily.

**Owns primarily:**
- external verification;
- provider test evidence;
- controlled sandbox/live tests;
- provider-specific documentation;
- small test-only fixes.

**Providers:** Meta, Pinterest, Google Business, LinkedIn, WooCommerce, Amazon, Flipkart.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM F: EXTERNAL PROVIDER VERIFICATION

Read all persistent docs plus docs/DIZITO_PROVIDER_VERIFICATION.md.

This is a verification workstream, not a feature-expansion workstream.

For each provider, first inspect current code and access state.

Meta:
- business_management review is currently pending;
- do not claim approval;
- when available, test customer-like Business Portfolio Page discovery, FB publish, IG publish, reconnect/failure.

Pinterest:
- Standard Access is granted;
- test real image Pin;
- verify returned Pin ID and persistence;
- then test video separately.

Google Business:
- apply for API access if not already done;
- record external status;
- do not claim access before evidence.

LinkedIn:
- controlled image/video publishing test.

Woo:
- real controlled create/update/reconcile/retry test.

Amazon:
- representative product-type/catalog/offer tests.

Flipkart:
- authorized sandbox/provider tests and authoritative response evidence.

Meesho:
- do not implement without authoritative API access.

Capture exact provider response, external ID, persisted state and failure/retry behavior. Never expose secrets in notes.

If a code defect is found, document it and make the smallest safe fix or hand it to the owning workstream.

Near chat limit: produce continuation handover with external status and exact next test.
```

## 8. Workstream G — Commerce Hardening

**Goal:** continue provider-neutral commerce reliability without competing with Marketing V1 work.

**Owns primarily:**
- `lib/commerce/providers/**`;
- commerce publish operation state;
- Woo/Amazon/Flipkart provider adapters;
- commerce migrations;
- commerce tests.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM G: COMMERCE HARDENING

Read all persistent docs plus docs/DIZITO_V1_LAUNCH_PLAN.md.

Do not restart Amazon or marketplace development.

Current state:
- Shopify is established;
- Woo and Flipkart have hardened provider-neutral boundaries;
- Amazon catalog matching and offer foundation exist;
- Meesho is externally blocked.

Prioritize:
1. controlled Woo verification support;
2. Flipkart verification support;
3. Amazon catalog/offer regression;
4. durable listing/variant/external-ID mapping;
5. sync/lifecycle/reconciliation;
6. retry/backoff;
7. inventory/price boundaries;
8. tenant/provider ownership;
9. idempotency.

Keep product content separate from offer/operational data.

Do not enable unsafe live provider mutations.

Run focused tests and document verification.

Avoid marketing UI/subscription/media changes.

Near chat limit: stop and provide exact continuation handover.
```

## 9. Workstream H — Infrastructure / Database / Observability

**Goal:** establish measurable beta-scale reliability without premature migration.

**Owns primarily:**
- DB migrations for observability/constraints;
- query/index analysis;
- Vercel/Neon operational configuration;
- structured logging/metrics;
- retention jobs.

**Prompt:**

```
CONTINUE DIZITO — WORKSTREAM H: DATABASE + INFRASTRUCTURE + OBSERVABILITY

Read all persistent docs plus docs/DIZITO_V1_LAUNCH_PLAN.md.

Current observed Neon state is approximately:
- 12 MB database;
- 46 public tables;
- 156 public indexes;
- very small current row counts.

Do NOT migrate database/hosting providers.

Audit:
- query/index usage;
- tenant constraints;
- high-volume event tables;
- webhook/publish/system log retention;
- connection behavior;
- slow-query instrumentation;
- Vercel function duration/concurrency;
- Cloudinary storage/bandwidth;
- backup/recovery expectations.

Enable safe observability such as pg_stat_statements where appropriate. Do not execute destructive SQL autonomously.

Recommend thresholds for when to scale Neon/Vercel/Cloudinary.

Future architecture should support:
Vercel API → durable queue → workers → providers → reconciliation.

Do not build the worker system unless a measured need or current task requires it.

Add only evidence-backed indexes/constraints/retention improvements.

Near chat limit: provide continuation handover.
```

## 10. Chat-limit continuation protocol

Every workstream must use this as the final response when the chat is nearing its limit:

```
DIZITO WORKSTREAM CHECKPOINT — [WORKSTREAM]

Repository:
rohansharma111/dizito-scheduler

Branch:
[branch]

Current HEAD:
[commit SHA]

Task:
[exact task]

Completed:
- ...

Changed files:
- ...

Database/migrations:
- ...

External dependencies/status:
- ...

Tests/checks run:
- ...

Results:
- ...

Known failures:
- ...

Important decisions:
- ...

Rejected approaches:
- ...

Do NOT redo:
- ...

Remaining work:
1. ...
2. ...
3. ...

Exact next step:
[one concrete next action]

Continuation prompt for the new chat:

CONTINUE DIZITO — [WORKSTREAM]
This is a continuation, not a new project.
Read AGENTS.md and all persistent docs.
Read this checkpoint.
Reconcile it against the current repository/branch/head before changing anything.
Do not redo completed work.
Continue from the exact next step above.
[PASTE CHECKPOINT]
```

## 11. Conflict avoidance

Before editing:
- check branch/head;
- check recent commits;
- inspect changed files;
- do not assume another chat is finished.

If another workstream has changed a file you need:
1. stop;
2. inspect the new version;
3. decide whether the dependency can be avoided;
4. if not, coordinate and use a small isolated change.

Never have two workstreams simultaneously editing the same migration file, billing model, provider adapter or global CSS file.

Shared files are especially sensitive:
- `AGENTS.md`;
- `docs/PROJECT_STATUS.md`;
- `docs/IMPLEMENTATION_LOG.md`;
- `docs/DIZITO_CODEX_PROJECT_CONTEXT.md`;
- `app/globals.css`;
- shared provider contracts;
- migration registry.

Documentation should normally be updated by the workstream that owns the change, followed by a reconciliation pass.

## 12. Recommended parallel execution

Run these in parallel:
- A — Marketing UI/design;
- B — Subscription/pricing;
- C — Video/media;
- D — Security;
- E — Marketing QA/CI;
- F — External provider verification;
- H — infrastructure/observability.

Run G — Commerce hardening in parallel only when its file ownership does not overlap with another active migration/provider task.

The user remains the final merge/priority authority.


## 13. Suggested branch names

Use one branch per active workstream:
- A: `v1/marketing-ui-design`
- B: `v1/subscription-pricing`
- C: `v1/media-video`
- D: `v1/security-audit`
- E: `v1/marketing-qa-ci`
- F: `v1/provider-verification`
- G: `v1/commerce-hardening`
- H: `v1/infrastructure-observability`

If a branch already exists, do not reset or force-push it. Create a continuation branch from the current workstream head only after reconciling the repository.

### Shared-file rule

Workstream A owns visual primitives and `app/globals.css`; Workstream B owns billing UI/backend; Workstream C owns media-specific UI/backend; Workstream D owns security helpers/tests; Workstream E owns tests/CI; Workstream F owns verification evidence; Workstream G owns commerce; Workstream H owns infrastructure/database observability.

If a change genuinely crosses boundaries, make the smallest interface change in the owning workstream and hand the dependent work to the other workstream rather than editing both systems in parallel.
