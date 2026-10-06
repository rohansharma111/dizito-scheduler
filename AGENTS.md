# Dizito Development Instructions

## Project identity

Dizito is an existing Next.js commerce + social publishing platform evolving into an **AI Commerce Operating System**. This is NOT a greenfield project.

Repository: `rohansharma111/dizito-scheduler`

Treat the current repository, schema/migrations, tests, and observed verification as the source of truth. Do not restart, redesign, or replace completed architecture without evidence and explicit approval.

## Source-of-truth order

1. Current repository code on `main`
2. Current database schema and migrations
3. Git history and current commit
4. Current project documentation
5. Historical handovers
6. Conversation context
7. General framework knowledge

If sources disagree, identify the discrepancy and update the relevant persistent documentation after verification.

## Mandatory workflow

**DISCOVER → VERIFY → PLAN → IMPLEMENT → TEST → REVIEW → DOCUMENT**

Before significant coding:
- inspect the relevant code paths, migrations, services/helpers, API routes, UI and recent commits;
- read `docs/PROJECT_STATUS.md`, `docs/IMPLEMENTATION_LOG.md`, and `docs/DIZITO_CODEX_PROJECT_CONTEXT.md`;
- check whether the requested feature already exists in another provider or shared service;
- identify tenant/authorization, persistence, idempotency and failure-state implications.

Do not claim a feature is production-ready merely because it is implemented.

## Current architecture

Canonical commerce boundary:

`Canonical Product / Variant → Commerce Channel / Connection → Provider Adapter → Provider workflow/API → Validate → Publish/Sync → Reconcile`

Shared provider orchestration lives under `lib/commerce/providers/`.

Provider-specific authentication, payload mapping, API details and provider identifiers remain inside provider adapters/workflows.

Canonical product data must remain provider-neutral.

## Current commerce providers

### Shopify
Established/closed foundation. Do not redesign unless a concrete dependency or regression requires it.

### WooCommerce
Active hardening target.

Current repository includes:
- connection and encrypted credentials;
- draft preparation;
- provider-neutral adapter registration;
- draft/publish/reconcile dispatch through shared commerce provider services;
- durable publish-operation/idempotency handling;
- ambiguous/unknown publish outcomes;
- reconciliation by provider-confirmed identity;
- tenant/channel binding;
- guarded live mutation.

Live WooCommerce production readiness is NOT established until controlled provider verification and CI/runtime evidence are complete.

### Flipkart
Active provider integration/hardening target.

Current repository includes:
- provider adapter and shared registry;
- draft, publish and reconciliation API routes;
- provider-neutral dispatch;
- channel/credential lookup and access-token refresh;
- guarded publish operation ledger;
- idempotency replay/conflict handling;
- provider lookup before reconciliation success;
- provider-confirmed external-ID persistence;
- terminal publish-state protection;
- explicit live-publish confirmation plus `FLIPKART_LIVE_PUBLISH_ENABLED` fail-closed guard.

Do not enable unrestricted live mutation. Exact provider response shapes and authorized sandbox behavior remain externally unverified unless a later verification entry says otherwise.

### Amazon India
Existing product-content foundation remains important:
- SP-API + LWA OAuth;
- product-type discovery;
- linked JSON Schema retrieval;
- schema-driven editor;
- explicit identity/ASIN handling;
- conditional requirements;
- product-only `VALIDATION_PREVIEW`;
- catalog matching UI/API;
- persisted catalog-match identity;
- separate offer-layer foundation.

Amazon product content and operational offer data must remain separate. Never infer ASIN/identity from SKU or barcode and never fabricate ASINs.

### Meesho
Provider-specific implementation is currently blocked. Do not invent API/auth/publish behavior. A provider-neutral contract and architecture/security audit exist, but authoritative Meesho partner/API documentation and authorized test access are still required before implementation.

## Provider-neutral contract rules

Use `lib/commerce/providers/contracts.ts` and the registry/service rather than creating provider-specific orchestration in shared layers.

The shared contract currently covers:
- draft
- publish
- reconcile
- sync operation vocabulary
- capability flags
- bounded success/failure/ambiguous results
- tenant/channel context
- opaque provider payload/response types
- explicit live-publish confirmation

Do not weaken the contract by allowing caller-supplied identifiers to bypass provider reconciliation.

## Publish safety

For provider mutations:
- require authenticated tenant/channel ownership;
- require explicit idempotency where the provider workflow requires it;
- persist durable operation state where applicable;
- distinguish failed from ambiguous/unknown outcomes;
- never mark publish success solely from caller-supplied external IDs;
- reconcile ambiguous submissions against provider state;
- preserve terminal operation state from later accidental overwrite;
- keep live mutation fail-closed until controlled verification authorizes enabling it.

## Marketing / AI operating system

Marketing is now an active product surface, not merely future scope.

Current areas include:
- Business Brain/context;
- goals/offers/products/media;
- campaigns/content items/content variants;
- AI Creator;
- AI Strategist;
- Generate My Week / weekly plans;
- customer actions and attribution;
- Business Impact;
- optimizer/evidence;
- experiment selection, dispositions and learning signals.

Recent hardening requires human review before saving AI-generated copy/channel variants and grounds Creator output in selected product/offer/content/campaign context. Malformed AI output must fail closed.

The optimizer must distinguish observed evidence from causality. Weekly planning may carry optimizer evidence, rationale, experiment provenance and deterministic experiment disposition, but approval does not mean automatic publishing.

Do not bypass review gates or fabricate attribution.

## Social account/reconnect rules

Recent fixes hardened account reconnect/status behavior:
- reconnect flows should not force unrelated Pinterest board selection;
- Google Business reconnect should not require a location selection when the existing connection already supplies the needed state;
- account health refresh must be scoped to the current user;
- disconnected social targets must not appear as publishable post targets.

Preserve these invariants when changing social account flows.

## Database rules

Use the repository's raw SQL migration convention and migration runner.

Preserve existing tenant ownership and relationships. Do not create duplicate domain tables without evidence.

Known commerce foundations include:
- `products`
- `product_variants`
- `product_media`
- `media_library`
- `commerce_channels`
- `product_listings`
- `product_listing_variants`
- `product_listing_media`
- `commerce_channel_credentials`
- provider credential tables
- durable commerce publish-operation tables

Inspect `db/migrations/*.sql` before changing persistence.

## Security

Never commit or expose:
- OAuth refresh/access tokens;
- API secrets;
- encryption keys;
- database passwords;
- provider credentials.

Credential retrieval must be tenant/channel scoped. Mutations must verify authenticated ownership.

## UI

Reuse the existing application shell, components and visual language. Extend existing workflows rather than creating duplicate architectures.

## Testing and verification

Use the repository's Vitest suite and GitHub Actions quality workflow where available.

At minimum for meaningful changes:
- run relevant unit/integration tests;
- run type-check/lint/build when practical;
- inspect migration impact;
- distinguish source inspection from runtime verification;
- distinguish mocked tests from real provider verification.

Current repository history contains many focused commerce and marketing regression tests, but the latest quality result must always be checked rather than assumed.

## Git / PR rules

- Work in an isolated branch for implementation.
- Make focused commits.
- Do not merge PRs without explicit user authorization.
- Keep documentation synchronized with meaningful implementation and verification changes.
- Record commit SHA and verification evidence in `docs/IMPLEMENTATION_LOG.md` and update `docs/PROJECT_STATUS.md` when status changes.

## Scope discipline

Payment/refund production-hardening work remains intentionally deferred. The core refund retry scenario has historical PASS evidence, but production-hardening edge cases remain open. Do not opportunistically restart that audit while working on current commerce/marketing tasks.

Meesho-specific implementation is blocked until external API/partner evidence exists.

Do not jump to later-phase marketplace operations merely because the architecture can support them.

## Framework rule

This project uses Next.js App Router + TypeScript. Before framework-level changes, inspect the installed Next.js documentation under `node_modules/next/dist/docs/` as required by the repository's framework rules.

## Definition of done

A task is done only when:
1. implementation matches the intended architecture;
2. tenant/security boundaries are preserved;
3. persistence/state transitions are correct;
4. relevant tests/checks are run or their absence is explicitly documented;
5. provider/live verification is not overstated;
6. regression risks and follow-up work are recorded;
7. persistent project documentation is updated when the task changes project state.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
