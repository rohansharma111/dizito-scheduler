# Dizito V1 — Pre-Screen QA Readiness and Screen Test Matrix

**Status:** CI gate passed; environment/browser QA execution pending  
**Last updated:** 2026-10-10  
**Purpose:** Make the next screen-by-screen browser QA pass repeatable and evidence-based. This is a checklist, not a claim that the checks have passed.

## Current known checkpoint

- Media race-safety PR #59 merged to `main` as `aa9ffd9902c505f3c5ba3c48c21ae280765afd27`.
- Production Neon migration `20261009_media_library_unique_cloudinary_public_id.sql` was applied to project `purple-wildflower-87394884`, branch `br-empty-rice-ayeuugek`, database `neondb`. Preflight duplicate-pair count was zero; the unique index and `schema_migrations` entry were verified afterward.
- Current `main` head at this checkpoint: `563617250f382cd8b3cd9ae74a92893419c47773` (`Document connected channel management improvements`). GitHub Actions **Validate passed**: https://github.com/rohansharma111/dizito-scheduler/actions/runs/38032852014. **Quality Checks passed**: https://github.com/rohansharma111/dizito-scheduler/actions/runs/38032852027. These are CI results only; they do not establish deployment health or browser/runtime correctness.
- Real Cloudinary test-cloud verification is pending. Provider-side pre-ingestion upload-size enforcement has not been proven.
- This plan does not authorize live publishing or external provider mutations.

## Gate 0 — Before opening the browser

- [ ] Confirm the deployed environment and exact deployed Git SHA; verify it contains the expected current `main` changes.
- [x] Run GitHub Actions Validate and Quality Checks on current `main` head `563617250f382cd8b3cd9ae74a92893419c47773`. Validate: https://github.com/rohansharma111/dizito-scheduler/actions/runs/38032852014. Quality Checks: https://github.com/rohansharma111/dizito-scheduler/actions/runs/38032852027. Both passed. Confirm the deployed SHA separately before browser QA.
- [ ] Verify the production/staging DB target, migration ledger entry, and unique index. Never run migration SQL against an unintended branch/database.
- [ ] Confirm app host health, required environment variables, OAuth callback URLs, public app URL, cron/worker configuration, and provider secrets are present without printing secret values.
- [ ] Use a dedicated QA merchant/user with no real customer data. Seed representative product/service, offer, campaign, image, video, and channel connection fixtures.
- [ ] Use provider sandbox/test accounts where available. Keep live publish/mutation flags disabled unless a specific test is separately approved and externally verified.
- [ ] Confirm test data cleanup policy; preserve logs/screenshots without access tokens, customer PII, signed upload URLs, or other secrets.
- [ ] Record browser/version, viewport(s), test account identifier alias (not email/token), environment, date/time, and deployed SHA.

## Gate 1 — Shared checks for every screen

For every screen, test and record:

- [ ] Route opens for an authorized user and redirects/blocks unauthorized access correctly.
- [ ] Initial loading, empty state, populated state, and recoverable error state render correctly.
- [ ] Required fields, malformed inputs, boundaries, duplicate submissions, and server-side validation behave correctly.
- [ ] Save/update persists after reload and is scoped to the correct tenant/user.
- [ ] Retry/back navigation does not duplicate records or skip approval gates.
- [ ] Keyboard navigation, visible focus, labels, dialog behavior, and narrow viewport layout are usable.
- [ ] No uncaught browser console errors, failed critical network requests, or secret-bearing logs.
- [ ] Capture screenshot/evidence, observed result, expected result, severity, and reproducible steps for every defect.

## Gate 2 — Screen sequence and core scenarios

| Order | Screen / journey | Minimum scenarios |
|---|---|---|
| 1 | Authentication and onboarding | sign-in/out, session expiry, protected routes, onboarding completion/resume |
| 2 | Dashboard / workspace entry | first-time empty state, populated state, navigation, summary consistency |
| 3 | Business Brain | required business context, edit/save/reload, incomplete context, AI context grounding |
| 4 | Products / catalog / services | create/edit/archive, validation, ownership, empty state, search/filter if present |
| 5 | Offers and campaign context | date/eligibility validation, active/inactive states, association to products/campaigns |
| 6 | Media library and upload | supported/unsupported MIME, size boundaries, cancellation/retry, upload completion replay, tenant isolation, image/video previews |
| 7 | Channel/account connections | connect/disconnect/reconnect, missing permissions, expired credentials, unsupported capability state |
| 8 | AI Strategist | missing prerequisites, generation success, malformed/provider failure, evidence/context relevance |
| 9 | Generate My Week | no-plan and existing-plan states, generation, retry/idempotency, plan persistence |
| 10 | Content review and approval | edit, reject, approve, required review gates, stale/duplicate actions |
| 11 | AI Creator and channel variants | selected context grounding, platform constraints, invalid output fail-closed, edit/save/reload |
| 12 | Calendar / scheduling / publishing | timezone and past-time validation, scheduling conflicts, provider failure/ambiguous state, safe non-live path |
| 13 | Customer Actions / attribution | record/view action, dedupe/idempotency, attribution linkage, empty and malformed input states |
| 14 | Business Impact / analytics | empty dataset, date filters, metric consistency, missing attribution caveats |
| 15 | Optimizer / learning loop | evidence vs causal claims, recommendation provenance, disposition/feedback persistence, next-cycle continuity |
| 16 | Pricing / billing / entitlements | public pricing load, plan/entitlement enforcement, checkout failure/cancel/retry, missing-plan DB errors |
| 17 | Cross-cutting responsive/navigation | desktop and mobile viewport, refresh/deep links, browser back, session timeout, access-control regressions |

Only test a row's feature if that route exists in the current code; record absent or inaccessible required V1 routes as a gap instead of assuming they exist.

## Gate 3 — End-to-end merchant journey

Run with the same QA merchant and record durable IDs (non-sensitive) at each stage:

1. Sign in and finish onboarding.
2. Complete Business Brain and create/confirm a product/service, offer, and media asset.
3. Generate strategy and a weekly plan.
4. Review/edit and approve selected content.
5. Generate Creator output and channel variants.
6. Schedule a safe test item; publish only through an explicitly authorized sandbox/test provider path.
7. Record a customer action and confirm attribution linkage.
8. Open Business Impact and optimizer; verify metrics are grounded in available evidence and feedback persists into the next planning cycle.

For each stage, confirm the created/updated record survives reload and the next stage uses the same underlying entity rather than an unrelated mock or stale client state.

## Defect severity and evidence

- **P0:** data exposure/cross-tenant access, credential leak, unauthorized live publish, destructive data loss. Stop QA and escalate.
- **P1:** core V1 journey blocked, approval bypass, wrong-tenant persistence, unrecoverable publishing/scheduling state.
- **P2:** major screen flow broken with workaround, inaccurate business metric, common responsive/accessibility issue.
- **P3:** minor visual, copy, or edge-case defect.

Each finding should include: ID, route, SHA/environment, setup, steps, expected/actual, screenshot or sanitized network evidence, severity, owner/workstream, and regression-test proposal.

## Exit criteria

- CI evidence exists for the exact tested SHA.
- All required screens have a recorded result, including explicit not-tested/blocked reasons.
- No open P0/P1 defects.
- End-to-end merchant journey has evidence of persisted state across stages.
- Provider-specific tests are clearly labeled sandbox vs live; no unverified provider capability is called production-ready.
- Known limitations (including unproven Cloudinary pre-ingestion size enforcement) remain visible in the handover.
