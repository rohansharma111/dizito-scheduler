## 2026-10-09 — Zero-AI-spend marketing workflow implemented

- Added server-side AI availability switch `DIZITO_AI_ENABLED`; AI endpoints for Strategist, Optimizer, AI weekly strategy, and AI copy generation return a clear 503 `AI_COMING_SOON` response unless the env var is explicitly `true`. This is opt-in and prevents these endpoints from calling OpenAI while the feature is disabled. `/api/marketing/ai-status` exposes the switch to authenticated UI surfaces (status only; it does not reveal credentials).
- Updated AI Strategist, AI Optimizer, Marketing Content, and Generate Week UI to show Coming Soon states and disable AI generation controls while disabled. Manual editing, scheduling, approvals, Business Brain, Business Impact, and the deterministic `/api/marketing/weekly-plans/generate` workflow remain available.
- Added editable five-post template-week creation to `GenerateWeekClient`, using existing product/offer names when available and factual placeholders for merchant personalization. Added manual copy editing in Marketing Content and a no-AI-credit notice to the current `/generate-my-week` flow.
- Important operator setting: leave `DIZITO_AI_ENABLED` unset or `false` until a funded AI provider is configured; set it to `true` later to re-enable AI endpoints and controls without removing the manual path. No API key was added or changed.
- Commits include `969dd33`, `a22b5d8`, `be103d9`, `bfd3962`, `ed6a0a6`, `f301175`, `e8a530f`, `3baae0a`, `b6c0576`, `450b519`, `a4fa70c`, `1ba80d2`, `78ec68e`, `191b93b`, `6c20391`, `ada2be2`, `53d0c52`, `47283b0`, `e199156`, `9c0ff71`, `e6f8970`, `15d7058`.
- Automated CI and browser verification for the final code state remain pending. Do not claim runtime success until the current runs complete and the manual flow is tested.

## 2026-10-09 — Homepage positioning clarified: social media scheduler

- Updated the public homepage copy directly on `main` to position Dizito clearly as a social media scheduling and publishing product, rather than leading with broader “operating system” language.
- Hero now leads with “Your social media calendar, all in one place” and explicitly names Instagram, Facebook, LinkedIn, Pinterest and Google Business. Reframed the workspace, walkthrough, features, workflow, audience and final CTA around drafts, calendar planning, scheduling, review and publishing.
- Visual layout, route destinations, session-aware CTA, demo video, feature list, and underlying app behavior are unchanged. Pricing page positioning was not changed in this pass.
- Commit: `a0f2a1f8854314e36425e9313f2ef5ac6e9ab08c`.
- Verification boundary: source copy reviewed; CI and desktop/mobile browser screenshots have not yet been run for this follow-up.

## 2026-10-09 — Public homepage, pricing and footer visual correction (PR pending)

- Branch: `v1/public-pages-visual-polish`.
- Reworked the canonical `app/(marketing)/page.tsx` presentation around Dizito's violet/lime/soft-neutral visual language, restoring a styled product walkthrough and preserving public destinations and session-aware login/dashboard CTAs.
- Reworked `app/(marketing)/pricing/page.tsx` to align plan titles and prices, reserve equal space for the Recommended badge, improve mobile stacking, and use consistent feature indicators. Pricing data/fallback behavior and PricingButton checkout dispatch are unchanged.
- Updated `components/billing/PricingButton.tsx`, `app/(marketing)/layout.tsx`, and `components/Footer.tsx` for the public-page button/header/footer visual system and responsive layout.
- Removed duplicate `app/page.tsx`, which and `app/(marketing)/page.tsx` both resolve to the root URL in the App Router. The marketing route is now the single canonical homepage; its primary CTA uses the session and does not need a separate users.plan lookup to render the page.
- Commits on the branch include `ebb7acfd2ddb835d007845d6a534adaf5d235ff4`, `759e770fe73582961f37599ba8abbdeaf761d488`, `d75176190b84d3c9dd5073c55cc85342c47abc56`, `35ed689dca3a2ee33054bb572484c74f54ca3df3`, `24d92f7a43e7f7fc3eda5fa6a04382cd1e8e680d`, and `1d9ff7d7324a3ea6724341805693ed949a07c0b3`.
- Verification: GitHub Actions Validate and Quality Checks passed on code commit `871200b9f894db6a1066165dedd12577266a69e4` (tests, lint, TypeScript, and production build). Browser screenshot verification has not been run, so confirm `/` and `/pricing` visually in the local app before calling the blank-page issue runtime-verified.

## 2026-10-09 — Fix content item aggregate query

- Fixed PostgreSQL `42803` in `lib/marketing/contentItems.ts` by grouping joined campaign and offer tables by their primary keys (`ci.id, c.id, o.id`) in both list and detail queries. This preserves the existing tenant-scoped joins and distinct aggregations while satisfying PostgreSQL grouping rules.
- Commit: `69d158aa9e2971f6849da89eba3c60eced8c8279`.
- GitHub CI for this exact commit has not yet been confirmed. Browser/API smoke tests remain pending.

## 2026-10-09 — Marketing content/attribution migrations applied to production

- Follow-up runtime errors showed additional marketing schema migrations were absent: `marketing_customer_actions`, `marketing_asset_metadata`, `marketing_content_items`, and related strategy/content/attribution tables.
- Applied repository marketing migrations 006–016 (marketing files only; excluding the unrelated `016_commerce_tenant_integrity.sql`) plus `020_marketing_content_item_variant_posts_v1.sql` to Neon production project `purple-wildflower-87394884`, database `neondb`, branch `br-empty-rice-ayeuugek`.
- Used temporary branch `br-misty-king-ay3jl62h` for preflight; verified core tables on the temporary branch, then applied the migration bundle to production. Verified production relations and all 12 corresponding `schema_migrations` ledger entries at `2026-10-09T13:40:50.555Z`.
- No content, customer-action, attribution, campaign, or business records were seeded. The bundle includes the repository planning-metadata column/comment; the comment text was adjusted from a semicolon to a comma solely to accommodate the migration runner's statement splitting, with no schema/behavior change.
- API/browser smoke testing is still pending. Retry Strategist, Generate Week, Optimizer, and Content Items and capture any new errors.

## 2026-10-09 — Production Marketing Foundation migration applied

- Applied `db/migrations/005_marketing_foundation_v1.sql` to Neon production project `purple-wildflower-87394884`, database `neondb`, branch `br-empty-rice-ayeuugek` (`production`).
- Used a temporary Neon branch to execute and validate the migration first; verified all three tables (`marketing_business_profiles`, `marketing_goals`, `marketing_offers`) and the three expected indexes before applying to production.
- Verified the three relations exist on production and recorded `005_marketing_foundation_v1.sql` in `schema_migrations` at `2026-10-09T13:31:29.072Z`.
- No existing business, goals, or offer rows were seeded or altered by this schema migration. Retest `GET /api/marketing/business-brain` and `/orders` from the running application; browser/API smoke verification has not been performed from this session.

## 2026-10-09 — Orders route and local marketing schema diagnosis

- Added the missing protected `/orders` page, using the existing tenant-scoped `GET /api/orders` endpoint with search/status filters and loading/empty/error states. Commit: `4e271ff237ba68e869bb2520d9002bec20bc101c`.
- Local runtime also reports `marketing_business_profiles` missing. The repository already defines that table in `db/migrations/005_marketing_foundation_v1.sql`; this points to a local `DATABASE_URL` whose database has not had the repository migrations applied, or to a different database than expected. Run `npm run db:migrate` with the intended local `.env`/`DATABASE_URL`, then restart the dev server and verify the marketing tables. Do not apply migrations to production merely to fix a localhost error.
- Browser/local DB verification has not been performed from this session.

## 2026-10-09 — Billing navigation and subscription-action guard (main)

- Fixed sidebar active matching to use exact route boundaries. `/settings/billing` now activates Billing without also activating the parent `/settings` item.
- Billing plan-change buttons are now shown only when a provider subscription ID is present. For accounts without a provider-managed subscription, the screen explains why in-place plan changes are unavailable and links to pricing instead of sending a request that fails with `No active subscription`.
- Main commits: `e4b47d0453d9c57513167e1901f7f903ba568682` (sidebar), `64a900feabee506e2569172331fff5fd506bf1c8` and `577f9f5377201d83c4f420223aebd6434dee922b` (billing UI guard).
- Verification pending: no local tests/browser run for these changes yet; fresh GitHub Actions status should be checked before treating the fix as validated. The underlying subscription state is not modified and no payment record is created.

## 2026-10-09 — Post-merge CI fix: billing fallback catalog test

- The first post-merge Quality Checks run failed one test in `lib/billing/schema-compatibility.test.ts`: it compared fallback plan codes against `Object.keys(LEGACY_PLAN_TO_V1)`, which intentionally includes the legacy alias `creator` in addition to canonical V1 plan codes.
- Corrected the assertion to compare the fallback catalog keys with `BILLING_PLAN_CODES`. This fixes the test contract without changing billing runtime behavior or the legacy `creator` → `growth` mapping.
- Direct-main commit: `017d932d4a908f411a6d61ca340664302558a728`.
- Validate passed on merge commit `66338466bb3512f5caf28219ca249d7d1b143254`; Quality Checks failed only at the test step (189 passed, 1 failed). Fresh CI for this test correction is pending; do not mark it green until new runs finish.

## 2026-10-09 — Billing API schema mismatch compatibility (main; runtime connection still to verify)

- Added a guarded legacy-compatible response to `GET /api/billing` when the connected database cannot see the canonical V1 billing tables or subscription linkage column. The response uses the legacy plan mirror and matching static catalog/entitlements instead of returning HTTP 500 for missing canonical relations.
- Added diagnostic logging for current database, schema, search path and missing canonical relation flags; no connection string or credential values are logged.
- Neon production branch `br-empty-rice-ayeuugek`, database `neondb`, has migration 021 applied and was verified to contain the canonical billing plan/entitlement tables. If the deployed endpoint still reports `billing_plans` missing, inspect the deployment's `DATABASE_URL` and PostgreSQL search path; they likely do not match the migrated Neon branch/schema.
- Regression tests are committed but not run in this session. GitHub Actions and live `GET /api/billing` verification are pending. This is a compatibility mitigation, not proof that deployment database configuration is correct.

## 2026-10-09 — Shared table pagination and bulk validation filters (committed directly to main)

- Added `components/dizito/TablePagination.tsx`, a shared accessible pagination footer with 25/50/100 page sizes, previous/next controls, bounded page-number rendering, item counts, and no navigation clutter for single-page tables.
- Applied it to the Bulk Upload CSV preview, Products, Product Variants, Inventory, Inventory Movement History, Draft Posts, and Scheduled/Published Posts. Pagination is currently client-side over each screen's existing loaded dataset; this is a consistent presentation/interaction layer, not a claim of server-side query pagination.
- Bulk Upload now has All / Valid / Invalid / Duplicates filters and retains original CSV row numbering. The header checkbox selects/deselects valid rows on the current page only; selections across other pages are preserved. Existing import validation and import request behavior remain in place.
- Direct-main commits include `8cbeda7a949d699202056a6b94735e14e6eeabf8` (shared pagination), `d88c2f26138a973b784394e49f103adf742aca2b` (bulk preview pagination), `a570ce78f953e817602e1741b8b7e0dc77aa23ac` (inventory), `b4f93b12bec44a368eef8e0c17555ed05dc8cfaf` (drafts), `21f8294a6cc6860eb8399ee370ecb7b958b4ba93` (scheduled/published), `48cfb403bb6b22c821e4b6e7cac558787db5f06d` (products table), `4c9272f4904c31a109abc9fe5efb35c4979353ab` (variants), `d849a786086ea572c40562f9c0a2dbb6b12089e0` (movement history), and `47455031200dc046b2e5195f6805bc65292d407e` (pagination rendering optimization).
- Verification boundary: no local lint, typecheck, tests, build, or browser checks have been run. Workflow lookup has not yet confirmed CI. Inspect the final diffs and validate row selection/filter/page transitions before calling this verified. For large datasets, move the query and total count to server-side pagination in a follow-up rather than relying indefinitely on loading all rows into the browser.

## 2026-10-09 — Workstream B production billing schema applied

- Applied `db/migrations/021_billing_v1_plans_entitlements.sql` to Neon production project `purple-wildflower-87394884`, database `neondb`, branch `br-empty-rice-ayeuugek`.
- Recorded `021_billing_v1_plans_entitlements.sql` in `public.schema_migrations`. Read-only verification confirms the canonical billing plan/entitlement tables and subscription billing-plan linkage are present.
- Growth catalog verification confirms 10 entitlement assignments, including social channels 10, commerce channels 2, publishing actions 500/month, AI actions 250/month, Business Brain/Strategist/Creator/Generate My Week/commerce enabled, and Optimizer disabled.
- This establishes production schema/catalog availability only; it does not verify Razorpay checkout, provider webhooks, payment processing, deployment state, or browser/runtime behavior. Razorpay plan mappings remain a separate configuration/verification dependency.

## 2026-10-09 — Mobile commerce table readability (committed directly to main)

- Root cause identified in `app/globals.css`: a global `body { overflow-wrap: anywhere; }` caused ordinary words, headings, and table cells to break at arbitrary character boundaries on narrow screens. Changed the global body rule to `overflow-wrap: normal`; the targeted `pre, code` rule still allows long code tokens to wrap.
- Added deliberate horizontal scroll widths to the products list (640px), product variants (680px), and inventory table (900px) so columns remain readable rather than collapsing. Added responsive stacking for the Variants heading and a full-width mobile Add Variant action; existing event handlers remain unchanged.
- Direct-main commits: `7666e3bc44e904324480020310bd4436d4b9f10a` (global wrapping), `1e6b318d9e36b83b04831c1775679a75fc54e556` (products table), `284a68f00b4203e0b0462f5731caf4956bf2f8ab` (variant table), `721f97d5d1d03e1b110927f9a60f630e1099ea20` (inventory table), `f6222b8802ebd668a9549b4e5ce3f5860f5aa717` (responsive variant header).
- Scope is responsive presentation only. Product/variant/inventory persistence, values, filters, modal handlers, stock operations, and API calls are unchanged. No local lint/typecheck/test/build or real-device/browser checks have been run; verify horizontal scroll and labels at 320px, 360px, 390px, and tablet widths before declaring visual acceptance.

## 2026-10-09 — Narrow-screen Drafts actions (committed directly to main)

- Updated the mobile draft-card action row in `components/DraftPosts.tsx`: reduced narrow-screen padding/gaps, prevented button labels from breaking into one letter per line, retained readable labels from 360px upward, and added explicit accessible action names and keyboard-focus styles.
- Commit: `637b2769fae283cc28d1854a31ae995401dbb99e`.
- This is presentation/accessibility-only; draft view/edit/delete/duplicate/schedule handlers are unchanged. Lint, typecheck, tests, build, and device/browser visual checks have not been run.
- Additional supplied mobile screenshots show product/variant tables collapsing into vertically stacked characters. Their source components still need to be identified from the repository's actual route/component tree before changing layout; do not guess at those paths or apply broad global table rules.

## 2026-10-09 — Publish Details modal visual polish (committed directly to main)

- Restyled `components/PublishDetailsModal.tsx` with a softer overlay, rounded elevated panel, clearer heading/summary, refined platform cards, readable error/reconnect callouts, consistent action buttons, and responsive spacing. Added scoped animation/layout rules in `components/PublishDetailsModal.module.css`, respecting reduced-motion preferences.
- Direct-main commits: `a5e0bffb38184f1dbf81c96810519bc99968850b` (component) and `f57b1a2ae4a06b27d2cd85f96c379a9762146e8e` (styles).
- Publish/retry counts, status display logic, API endpoints, retry/reconnect handlers, and modal open/close behavior were preserved. No API, database, migration, or provider behavior changed.
- Lint, typecheck, automated tests, build, and browser visual QA have not been run for this change; latest-main CI is unconfirmed.

## 2026-10-09 — Draft and scheduled post list visual polish (committed directly to main)

- Updated `components/DraftPosts.tsx` and `components/ScheduledPosts.tsx` with shared scoped presentation styles in `components/PostLists.module.css`: refined empty states, headings, table borders/spacing, table headers/rows, and action focus affordances. Empty-state CTAs now use Dizito's lime primary action styling.
- Changes were committed directly to `main`: `ff9c0df30db95b57b63592698092c09c3bb9f0c0`, `94d047aca6815da6c121e20c4bf939dba1121b55`, and `5dbd380ae6538a5d2db36501ebe0b6f0308b5856`.
- Scope is presentation-only; post filtering, API calls, delete/duplicate/retry/edit/view/details actions, target indicators, and status logic remain in place. Lint, typecheck, tests, build, and browser visual QA have not been run for this change; check current-main CI before treating it as verified.

## 2026-10-09 — Media completion concurrency hardening (merged; production migration applied)

- PR #59 merged to `main` via squash commit `aa9ffd9902c505f3c5ba3c48c21ae280765afd27`. The change adds a duplicate-preflight migration and unique index on `public.media_library(user_id, cloudinary_public_id)`, and makes repository insertion race-safe with `ON CONFLICT DO NOTHING` followed by loading the winner row. Repository regression tests cover insert, concurrent replay, and fail-closed conflict handling; prior signed-upload and service tests were retained.
- Production Neon project `purple-wildflower-87394884`, branch `br-empty-rice-ayeuugek`, database `neondb`: immediately before migration, duplicate-pair count was 0 and target index did not exist. Applied the migration transactionally and recorded `20261009_media_library_unique_cloudinary_public_id.sql` in `public.schema_migrations`. Post-apply verification confirmed the unique index definition and migration ledger row. No duplicate repair/deletion was needed.
- GitHub workflow lookup returned no PR-triggered workflow runs for merge commit `aa9ffd9902c505f3c5ba3c48c21ae280765afd27`; do not treat that as CI success. Browser/runtime screen QA has not yet been performed. Real Cloudinary test-cloud verification remains pending, and provider-side pre-ingestion size enforcement is still unproven.
- Next: run pre-screen readiness checks, then execute the screen-by-screen merchant journey in a controlled staging/test environment: authentication/onboarding → Business Brain → catalog/products/offers/media → Strategist/Generate My Week → review/approval → Creator/channel variants → calendar/scheduling/publish → customer actions/attribution → Business Impact/optimizer. Record each screen's route, test account/fixture, happy path, validation/empty/error states, persistence/reload, tenant isolation, console/network failures, screenshots, and defects. Keep live provider mutations disabled unless separately authorized and verified.

## 2026-10-09 — Media completion concurrency hardening (implementation branch)

- Follow-up branch `v1/media-completion-race-safety` adds a migration that creates a unique index on `(user_id, cloudinary_public_id)` and aborts transactionally if duplicate pairs exist, rather than silently choosing or deleting records.
- `MediaRepository.create` now uses `ON CONFLICT ... DO NOTHING RETURNING` and loads the winning row on a concurrent duplicate insert. Added `lib/media/repository.test.ts` covering insert, concurrent conflict replay, and fail-closed behavior. Existing signed-upload route and media-service regression tests are preserved.
- Added `docs/MEDIA_UPLOAD_VERIFICATION.md` with the controlled test-cloud procedure, test inventory, byte-size enforcement boundary, and production migration gate.
- No production migration, Cloudinary upload/mutation, or deployment performed. Run CI against the branch before merge. Production migration must wait for a fresh read-only duplicate preflight and an approved migration window. Cloudinary runtime verification remains blocked on designated test-cloud credentials.

## 2026-10-09 — Signed video upload contract hardening (implementation branch; CI passed)

- Branch `v1/media-signed-upload-contract` adds a server-generated `users/{userId}/video-{UUID}` Cloudinary public ID and signs that ID plus MIME-specific `allowed_formats`; the browser sends those exact values in the direct-upload request. This removes browser control over the provider asset identifier and binds supported-format restrictions to the signature.
- The change does **not** claim pre-upload byte-size enforcement: the requested size remains an application admission check and actual Cloudinary bytes are checked during completion. Verify an actual provider-side byte limit or choose a separately reviewed server-controlled path before claiming prevention of oversized provider ingestion.
- Read-only production schema inspection on Neon `purple-wildflower-87394884` / branch `br-empty-rice-ayeuugek` found no unique index on `(user_id, cloudinary_public_id)`. A duplicate scan returned no current duplicates. Concurrent completion can therefore still race; unique-index/migration design is a follow-up and was not applied.
- Signature route tests now assert generated scoped identity, signed format restrictions, QuickTime format policy, and MIME normalization. GitHub Actions Validate and Quality Checks passed on PR head `83d24d81203b0b948bc7f0158a12d1018f1b25c9`. Actual Cloudinary runtime verification remains pending. No merge, production write, migration, or provider mutation performed.

## 2026-10-09 — Signed direct-upload scope and completion replay hardening

- Restricted `POST /api/upload/signature` to supported video MIME types. Images must use the server-proxy upload route, where the server validates file signatures before storage; the signed-direct path can no longer issue image-upload signatures.
- Fixed direct-upload completion idempotency so Cloudinary resource type, exact format/MIME pairing, ownership, and actual byte-size policy are verified before looking up and returning an existing media-library record. Invalid retry payloads cannot bypass validation just because the public ID already exists.
- Added route tests for unauthenticated/rate-limited signature requests, image signature rejection, and successful video signing; added a service regression test for invalid format on an idempotent retry.
- Exact code checkpoint: [`8904b46`](https://github.com/rohansharma111/dizito-scheduler/commit/8904b46bd399b677456489ff9dd48473cd0b967b). Both GitHub Actions workflows passed: [Validate run 37910264539](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37910264539) and [Quality Checks run 37910264341](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37910264341). The preceding implementation and regression-test commits also passed both workflows.
- No production deployment, production database change, external Cloudinary mutation, or browser QA was performed.

## 2026-10-09 — Streamed multipart request byte cap

- Added `readRequestBodyWithLimit` and applied it to the server-proxy upload route before multipart parsing. The route now enforces a hard maximum request-body byte count even when `Content-Length` is absent, and cancels the stream when the limit is exceeded.
- Declared-length preflight remains an early rejection optimization; the stream reader is the authoritative application-level cap before multipart parsing. This does not replace platform ingress limits or remove the bounded buffer required to parse the request.
- Added unit tests for bounded, oversized streamed, and empty request bodies, plus route-level coverage proving a streamed oversized upload without `Content-Length` returns 413 before media upload. The route comment now accurately reflects that streamed requests are capped. Both GitHub Actions workflows passed for the route-test commit [`9f6c159`](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37904899166) ([Quality Checks](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37904899183)) and the subsequent comment cleanup [`d081d74`](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37904920123) ([Quality Checks](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37904920004)). The earlier type correction also passed both workflows. No deployment, production database change, provider mutation, or browser QA was performed.

## 2026-10-09 — Media upload API guard regression tests

- Added route-level Vitest coverage for upload authentication, invalid session IDs, rate limiting, malformed/unsafe/oversized declared content lengths, malformed multipart bodies, completion payload validation, and cross-user Cloudinary public-ID rejection.
- Malformed multipart bodies now return a client-facing 400 response instead of falling through to the generic server-error handler.
- The earlier request-size preflight still only validates declared `Content-Length`; an upstream/runtime request-body cap remains required for requests that omit it. CI for the new API tests is pending.
- No deployment, production database change, provider mutation, or browser QA was performed.

## 2026-10-09 — Multipart upload size preflight

- The server-proxy upload route now checks a valid declared `Content-Length` before calling `request.formData()`, rejecting malformed lengths and bodies above the 25 MiB image allowance plus 1 MiB multipart overhead.
- This is an early-rejection safeguard only. Requests without `Content-Length` (including chunked transfer) still require an enforced upstream/runtime request-body cap; this route check alone does not bound all multipart parser memory use.
- CI for the implementation commit is pending. No deployment, production database change, provider mutation, or browser QA was performed.

## 2026-10-09 — Proxy upload service validation

- Server-proxy image uploads now re-apply the shared MIME/byte-size policy inside `MediaService`, normalize MIME declarations, and validate file signatures before invoking Cloudinary. The service rejects video uploads on this path and requires signed direct upload for video.
- Added regression coverage for oversize images, MIME/signature mismatch, and MIME normalization. These checks protect the service boundary even when a caller bypasses route-level validation.
- CI is required to confirm the new service tests and repository-wide checks. Request-body buffering limits remain a separate deployment/runtime boundary; a `Content-Length` check alone would not stop chunked requests.
- No browser QA, deployment, production database change, or provider mutation was performed.

## 2026-10-09 — Media service upload-policy defense in depth

- Direct Cloudinary upload completion now re-applies the shared upload policy inside `MediaService`, not only in the HTTP route. This protects the persistence boundary against oversized, fractional, non-safe-integer, or MIME/resource-type-inconsistent provider byte counts.
- MIME declarations are trimmed and lowercased before service-level validation; allowed formats, per-user Cloudinary public-ID ownership checks, and repository user scoping remain enforced.
- Added service regression tests for uploads over the 1 GB video limit and fractional byte counts. CI must complete on the resulting commits before this checkpoint is considered validated.
- No browser QA, deployment, production database change, or provider mutation was performed.

## 2026-10-09 — Workstream E repository validation green on lint-remediation head

- PR #57 is open and unmerged on `feature/lint-remediation-2026-10-09`, latest head `9c37cb5064753425ad2acc3ca30b130ddd307580`.
- This branch carries the focused Workstream E commerce-test fixture reconciliation plus the transitional ESLint policy and the small build/runtime-boundary fixes required to make repository validation executable.
- The transitional ESLint policy moves the legacy diagnostics `no-explicit-any`, `no-empty-object-type`, `react/no-unescaped-entities`, `react-hooks/set-state-in-effect`, and `jsx-a11y/alt-text` to warnings. The underlying lint debt remains visible and is not represented as fully remediated.
- Fixed the nine blocking lint errors exposed after the transitional policy in activity, analytics, notifications, onboarding, dashboard and accounts UI paths.
- Fixed build-time provider initialization failures by lazily initializing the Razorpay client (`lib/razorpay.ts`) and OpenAI image client (`lib/ai/imageGenerator.ts`), so build-time route analysis does not require production credentials. Credentials remain required when the provider operation actually executes.
- Fresh CI on the exact latest head completed successfully:
  - **Quality Checks #853: PASS** — 145/145 tests, lint, and production build all passed.
  - **Validate #802: PASS** — lint, TypeScript validation, and production build all passed.
- This is repository CI verification for the branch, not provider/runtime/external verification and not production readiness.
- No production database change, credential mutation, provider mutation, or merge was performed.
- PR #56 remains open/unmerged separately; PR #57 is the current CI-green QA/lint-remediation candidate.

## 2026-10-09 — Workstream E lint-remediation staging

- Created branch `v1/lint-remediation-2026-10-09` from the fully passing-test QA head `b6721e773134177f093485ad7ba1dda0d4b7f465`.
- Added a transitional ESLint severity policy for the legacy diagnostics currently blocking repository validation: `no-explicit-any`, `no-empty-object-type`, `react/no-unescaped-entities`, `react-hooks/set-state-in-effect`, and `jsx-a11y/alt-text` are now warnings on this branch.
- This does **not** claim the underlying lint debt is fixed; the diagnostics remain visible and require incremental remediation.
- No application runtime behavior, database schema, credentials, or provider integrations were changed.
- PR creation for this branch could not be completed by the current GitHub action safety gate; the branch is ready for review/PR creation when permitted.

## 2026-10-09 — Workstream D migration 023 production application

- Migration `023_api_rate_limits.sql` was explicitly authorized and applied to Neon project `purple-wildflower-87394884`, database `neondb`, production branch `br-empty-rice-ayeuugek`.
- The prepared migration `3afcd733-c0e6-46a7-990d-b794eb03cc79` was completed with `apply_changes: true`; its temporary validation branch was deleted after successful application.
- Read-only production verification confirms `public.api_rate_limits` exists, `api_rate_limits_updated_at_idx` exists, all 4 expected columns are present and NOT NULL, and the table contains 0 rows immediately after migration.
- No application data was modified beyond the additive schema objects in migration 023. No destructive SQL or provider mutation was performed.
- The distributed rate-limit runtime paths still require application deployment/merge and runtime verification; schema application alone does not establish end-to-end limiter enforcement.

## 2026-10-09 — Workstream D deployment-readiness checkpoint

- Production Neon (purple-wildflower-87394884, default branch production) was inspected read-only for the security deployment boundary.
- Encrypted social-account columns are present. A count-only credential audit found 0 social_accounts rows containing legacy plaintext access/page/refresh tokens, with 2 rows containing encrypted credential material.
- oauth_page_selections currently has 0 rows and therefore no legacy plaintext selection credentials requiring migration at this checkpoint.
- The distributed rate-limit table api_rate_limits is not present in production; migration 023_api_rate_limits.sql remains unapplied and must be explicitly applied before deploying code paths that invoke the new limiter.
- No production write, migration, destructive SQL, credential mutation, or provider mutation was performed.
- Latest completed PR #55 CI observed on head 1db22d85ea26fb415fc7828992fb703e005043cc: Quality Checks #832 failed at Test; Validate #770 failed at Lint. The security-specific regressions remain absent from the observed failure boundary, but repository-wide CI is not green.
- Workstream D next action is controlled application/verification of migration 023 and runtime security verification, subject to explicit production authorization; legacy credential migration readiness is currently favorable based on the count-only production audit.

## 2026-10-09 — Workstream D latest CI reconciliation

- Fresh PR #55 CI has now completed for the current security branch head: **Quality Checks #831** and **Validate #769**.
- Quality Checks #831 failed at the repository Test gate; Lint and Build were skipped. This is consistent with the previously observed Commerce/Flipkart/WooCommerce lifecycle-test drift rather than a newly observed Workstream D security regression.
- Validate #769 failed at the repository Lint gate; TypeScript validation and production build were skipped. The previously observed repository-wide lint debt remains the blocking validation condition.
- Workstream D therefore remains implementation-complete at its current security hardening boundary, but is **not CI-green and not production-ready**.
- PR #55 remains open/unmerged. No merge, production migration, destructive operation, or provider mutation was performed.
- Next D action remains controlled deployment/runtime verification plus legacy encrypted-credential migration readiness. Migration 023 still requires explicit production application before deployment of distributed rate-limit paths. Broader test/lint cleanup remains a Workstream E/QA responsibility.

## 2026-10-09 — Workstream D CI verification checkpoint

- Fresh CI completed for PR #55 head `7918a99812d657913c89e12e60f66b458d6e51d5`.
- **Quality Checks #829:** failed at Test with 8 existing Commerce/Flipkart/WooCommerce lifecycle failures. The prior Workstream D-specific rate-limit/media mock-hoisting failures and scheduler plaintext-credential regression are no longer present in the failure set.
- **Validate #767:** failed at repository-wide lint with **315 problems (237 errors, 78 warnings)**; TypeScript validation and production build were skipped by workflow gating.
- Workstream D security implementation is therefore not blocked by a currently observed security-specific test failure. Repository-wide CI remains red because of pre-existing QA/test/lint debt outside this security workstream.
- PR #55 remains open and mergeable but unmerged. No production migration, destructive operation, or provider mutation was performed.
- Migration 023 still requires explicit production application before code paths using the distributed limiter can be deployed.
- Workstream D next boundary is controlled deployment/runtime verification and legacy encrypted-credential migration readiness; broader test/lint cleanup belongs with Workstream E rather than introducing unrelated changes here.

## 2026-10-09 — Workstream D encrypted-credential regression fix

- PR #55 CI for head `649e7ac17950d2ccf2efbd679bf70efe52462079` completed with both Quality Checks and Validate red.
- Quality Checks now reaches the repository test suite; the remaining failures are existing Commerce/Flipkart/WooCommerce lifecycle drift, including WooCommerce reconciliation/publish test expectations. The earlier Workstream D rate-limit/media mock-hoisting collection failures are no longer present.
- Validate remains blocked by repository-wide lint debt: 315 problems (237 errors, 78 warnings), preventing TypeScript validation and production build from running.
- One scheduler test was still using a legacy plaintext social credential fixture. Updated `lib/scheduler/processTarget.test.ts` to use an encrypted credential fixture and explicitly verify decrypted credential resolution; production fail-closed behavior remains unchanged.
- New commit: `0d2e01c79c7fcbe6addc6139a3360b6abeef3a18`.
- Fresh CI is required after this test-only regression fix. PR #55 remains open/unmerged; no CI-green or production-ready claim is made. No production migration, destructive operation, or provider mutation was performed.

## 2026-10-08 — Workstream D security regression continuation

- Current main HEAD reconciled to `fd57fb359a0d54d94a4dfb9b2ae5dc010ebadd5e`; the historical security branch was stale and was not reused for implementation.
- New isolated branch: `v1/security-audit-2026-10-09`.
- Changed `lib/security/social-account-credentials.ts` so credential-bearing application paths never fall back to legacy plaintext social token columns. Encrypted values remain the only accepted credential source; plaintext-only legacy rows now fail closed with an explicit migration-required error.
- Added regression coverage in `lib/security/social-account-credentials.test.ts` for plaintext fail-closed behavior while preserving encrypted credential resolution and malformed-ciphertext rejection.
- No destructive migration or production backfill was executed. The existing controlled backfill remains the required migration step before affected legacy rows can be used.
- PR #55 opened against current main.
- GitHub Actions `Quality Checks` and `Validate` both executed on the branch and both currently fail at their existing Test/Lint gates; therefore this change is **not** marked CI-green or production-ready. No provider runtime verification was performed.

## 2026-10-08 — Workstream H reconciliation onto current main

- Reconciled `v1/infrastructure-observability` onto the current `main` lineage.
- Current `main` already contains `021_billing_v1_plans_entitlements.sql`, so the H observability migration is canonically represented as `022_infrastructure_observability_v1.sql` to avoid a migration filename collision.
- The production Neon observability changes were already applied during the earlier H checkpoint; reconciliation did not re-run or alter production SQL.
- Preserved the evidence-backed `pg_stat_statements` enablement and the two production indexes; the deferred `post_target_attempts` index remains absent.
- No marketing UI, billing business logic, provider adapters, media workflows, retention deletion, queue/worker architecture, or destructive SQL was introduced.

# Dizito Project Status & Roadmap

**Last updated:** 2026-10-08  
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


### 2026-10-08 — Workstream A merchant-surface consistency continuation
- Polished `app/(protected)/analytics/page.tsx` with Dizito page, metric, card, badge, and state primitives while preserving `/api/analytics`, premium gating, platform breakdown, insights, and recent-activity semantics.
- Polished `app/(protected)/campaigns/page.tsx` with Dizito cards, badges, buttons, responsive form controls, and state presentation while preserving campaign CRUD/status transitions, Business Brain relationships, Content Item creation/review flow, experiment links, and observed-impact reporting.
- No backend/API/provider/database/billing/media architecture changes were introduced.

### 2026-10-08 — Workstream A final merchant-surface consistency pass
- Polished remaining high-traffic legacy surfaces: Experiments, Attribution, Settings, and Bulk Upload with shared Dizito UI primitives and responsive states.
- Corrected a formatting defect in components/SidebarClient.tsx where escaped newline text had entered the navigation section definition.
- Preserved existing APIs, provider/account behavior, experiment semantics, attribution semantics, settings read-only behavior, and bulk-upload CSV/import logic.
- Final source-level audit found no merge markers, malformed escaped imports, or sidebar escaped-newline artifacts on the audited surfaces.
- Runtime build/lint/browser verification remains unavailable; branch must not be described as runtime-green.

## 2026-10-07 — Workstream B subscription/pricing implementation checkpoint

On branch `v1/subscription-pricing`, Workstream B has implemented the V1 billing model around:

`Billing Plan → Entitlements → Subscription → Provider Mapping → Usage`

Implemented in the branch:
- V1 catalog: Free, Growth, Pro, Agency/future and Founding Beta hypotheses;
- database-backed entitlement definitions and plan values;
- Razorpay provider-plan mapping without embedding Razorpay plan IDs in product logic;
- trial metadata, authenticated/active/pending/paused/failed/grace/cancelled/completed lifecycle handling;
- idempotent Razorpay webhook receipt tracking;
- authenticated plan changes and scheduled cancellation controls;
- centralized AI, publishing, social-channel and commerce-channel entitlement enforcement helpers;
- V1 pricing and billing settings surfaces;
- billing state/catalog regression tests.

Compatibility:
- historical `users.plan` and legacy Creator/Agency values remain as compatibility mirrors;
- existing `subscriptions` rows are mapped to canonical billing plans by migration;
- no workspace/multi-business migration was introduced.

Important rollout boundary:
- migration `021_billing_v1_plans_entitlements.sql` has been added to the branch but has **not** been applied to the default/live Neon branch;
- Razorpay provider mappings intentionally remain unpopulated until real Razorpay plan IDs are configured;
- Razorpay live checkout/webhook/provider verification remains external and is not claimed complete;
- branch tests/typecheck/build still require verification before merge.


## 2026-10-08 — Workstream B billing correctness + disposable migration verification

- **Status:** Implemented; not production-applied.
- Corrected subscription lookup so expired `payment_failed`/`grace_period` subscriptions no longer count as active; only an unexpired grace period retains paid access.
- Reworked subscription updates to distinguish omitted fields from explicit NULL, allowing cancellation and lifecycle transitions to clear nullable state such as pending plan changes/grace-period fields deterministically.
- Plan-change persistence now clears stale pending-plan state and explicitly removes scheduled cancellation state when switching back to a paid plan.
- Re-ran the V1 migration through Neon’s disposable migration flow on an isolated temporary branch. Validation confirmed all five catalog plans, ten entitlement values per plan, the three new subscription columns, and legacy subscription backfill behavior. The temporary branch was then discarded; the default/live branch was not changed.
- No Razorpay plan IDs were added. Provider mapping remains an explicit configuration dependency.


## 2026-10-08 — Workstream B final hardening checkpoint

- Billing API routes now use a typed authenticated-user helper with safe-positive-integer validation; no billing route needs `session.user as any` for user identity.
- Latest GitHub Actions run for PR #47 (head `d1d20b50d4fa1231d52092add093a7418729d509`) remains red at the repository test stage because of seven existing Commerce/Flipkart/WooCommerce test failures. No billing test failure was reported in that run; lint/build were skipped by workflow gating.
- The billing-specific implementation is therefore not claimed as repository-wide green. The branch remains intentionally unmerged and the default Neon branch remains unchanged.


## Workstream C — Reconciled onto current main — 2026-10-08

- The media/video workstream has been reconciled onto the current main lineage while preserving newer parallel-workstream changes.
- Video is a first-class media capability with direct signed Cloudinary upload, processing state, MIME/size/duration/dimension validation, poster support, and platform-specific publishing workflows.
- Image publishing remains supported and is not stored as video data in the legacy image_url field.
- Facebook video and Google video capabilities remain fail-closed where verification is incomplete/unsupported.
- The additive media schema migration is committed but remains unapplied to Neon pending explicit migration execution.
- Controlled provider runtime verification remains a launch gate for supported video workflows.


## 2026-10-08 — Workstream D reconciliation with current main

- PR #49 security work is being reconciled onto the current `main` lineage; implementation remains distinct from runtime verification.
- Preserved the security workstream's tenant isolation, OAuth state validation, encrypted social credential persistence, webhook/log hardening, upload signature validation, WooCommerce SSRF protections, and security regression tests.
- Social OAuth encrypted-only writes now cover Meta/Facebook, Instagram, LinkedIn, Google Business, and Pinterest; encrypted-first/legacy-fallback reads remain temporarily during migration.
- Production currently contains Pinterest social account 62 from the user's reconnect. Metadata-only inspection found legacy plaintext access/refresh fields and no encrypted credential fields; the row has not been modified or deleted by the reconciliation.
- Next launch-gate step is deployment of the reconciled `v1/security-audit` branch, followed by a controlled reconnect/health exercise and metadata-only verification. Legacy plaintext-column retirement remains deferred until runtime/provider verification is complete.
- Do not describe Workstream D as fully secure or production-certified.

## 2026-10-08 — Workstream D OAuth selection schema compatibility fix

- **Status:** Live schema compatibility fix applied; runtime verification still pending.
- The encrypted OAuth write path was blocked because legacy `oauth_page_selections.access_token` and `pages` columns remained `NOT NULL`.
- Live Neon default branch now allows those legacy fields to be NULL, matching the encrypted-column migration contract.
- Migration `020_oauth_page_selection_legacy_credentials_nullable.sql` is committed to keep fresh environments aligned.
- The separate `SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY` deployment configuration remains required before controlled reconnect/runtime verification can be completed.

## 2026-10-08 — Workstream D Pinterest board-selection runtime fix

- **Status:** Source fix committed; deployment/runtime verification pending.
- Pinterest board selection failed because the Pinterest boards endpoint read legacy oauth_page_selections.pages directly while encrypted OAuth writes populate pages_encrypted and leave pages NULL.
- The endpoint now resolves encrypted OAuth selection credentials through the shared resolver, safely handles absent/malformed board payloads, and no longer exposes raw internal error text.
- Commit: 97b15eec8630b2685d9286d0954d50a40004c3b3.
- Required next gate: deploy current main, ensure SOCIAL_ACCOUNT_TOKEN_ENCRYPTION_KEY is present, then retry Pinterest OAuth → board selection and verify encrypted credential metadata only.

## 2026-10-08 — Workstream D Pinterest encryption-version write hardening

- Pinterest connect/reconnect now explicitly persists `credential_encryption_version = 'v1'` whenever encrypted social credentials are written.
- This closes the metadata consistency gap found during the first successful encrypted Pinterest connection.
- Commit: `7da79919c4b5518e9170f8afd6f1e174ae57e15c`.
- Existing production Pinterest account was already normalized to `v1`; no credential values were read.

## 2026-10-08 — Workstream D cross-provider encrypted-credential audit checkpoint

- Production Pinterest runtime verification is now confirmed at metadata level: the connected account is `pinterest`, `connected`, has encrypted access/refresh credentials, has `credential_encryption_version = 'v1'`, and has no plaintext access/refresh/page credential fields.
- Audited Meta/Facebook/Instagram, LinkedIn, Google Business, and Pinterest OAuth paths on current `main`: credential writes are encrypted-only, while encrypted-first/legacy-fallback reads remain in migration compatibility mode.
- Meta OAuth temporary-selection creation now also records `credential_encryption_version = 'v1'`.
- Remaining source hardening: explicitly set the encryption-version metadata on every future Meta connect-pages, LinkedIn, and Google Business social-account write/reconnect path; runtime provider verification for those providers remains pending.
- Workstream D is not yet a production security certification.

## 2026-10-08 — Workstream D social-provider encryption metadata hardening complete

- Added explicit `credential_encryption_version = 'v1'` writes to Meta/Facebook/Instagram connect/reconnect, LinkedIn connect/reconnect, and Google Business connect/reconnect paths.
- Production metadata check currently shows the connected Pinterest account as `v1` encrypted with zero plaintext credentials.
- No other social provider accounts are currently present in the production database, so Meta, Instagram, LinkedIn, and Google Business runtime verification still requires controlled provider connections/reconnections when those credentials are available.
- Source-level encrypted-write hardening is complete for the audited social OAuth paths. Runtime provider verification and deployment-state verification remain separate launch gates.

## 2026-10-08 — Workstream D Meta account-selection encrypted-read fix

- Meta OAuth successfully reached `/accounts/select/meta`, but the UI showed zero accounts because `/api/account-selection` still read legacy `oauth_page_selections.pages` directly after encrypted-only writes moved the payload to `pages_encrypted`.
- Updated `/api/account-selection` to use `resolveOAuthSelectionCredentials(...)`, decrypt the encrypted page payload, safely handle missing/malformed selection data, and avoid exposing raw internal errors.
- Commit: `92c8bf25aec9d8881b6c9afc2ac096c5efba6d4f`.
- This is the Meta equivalent of the previously fixed Pinterest encrypted board-selection read issue. Deployment of this commit is required before the browser flow can be re-tested.

## 2026-10-08 — Workstream D Meta connect encrypted-selection parsing fix

- Meta account selection successfully loaded after the encrypted-read fix, but `/api/meta/connect-pages` returned HTTP 500 because the decrypted `pages_encrypted` payload is a JSON string and the endpoint attempted `pages.find(...)` before parsing it.
- Updated the endpoint to parse and validate the decrypted page-selection payload before iterating, with a safe invalid-session response.
- Commit: `c6d1d74f0ab5d78faa98dbe8981dddfc2799a86d`.
- This is another migration-read compatibility fix; no credential values were read or logged.

## 2026-10-08 — Workstream D Meta runtime verification passed

- Meta connection is now successfully verified through the browser flow after fixing the encrypted OAuth-selection read/parse path.
- Production metadata-only verification now shows Facebook, Instagram, and Pinterest accounts all have `credential_encryption_version = 'v1'`, encrypted credential material present, zero plaintext credential fields, and non-null tenant ownership.
- No credential values were retrieved or logged.
- Remaining runtime provider verification: LinkedIn and Google Business. Broader publishing/reconnect/refresh verification remains separate from connection-time verification.

## 2026-10-08 — Workstream D LinkedIn runtime verification + Google Business quota checkpoint

- LinkedIn connection is now runtime-verified at production metadata level: encrypted credential present, `credential_encryption_version = 'v1'`, and no plaintext access/refresh credential persisted.
- Google Business connection currently reaches the provider-resource discovery stage but returns Dizito's `QUOTA_EXCEEDED` error classification. The UI message is intentionally mapped to `Rate Limit Reached`.
- Source inspection confirms this classification originates from Google Business API errors containing `Quota exceeded`; it is not Dizito's internal account-plan limit.
- No repeated Google retries were performed to avoid amplifying a provider quota/rate-limit condition. Google Business runtime verification remains pending until the provider quota window clears or the Google Cloud API quota/permissions are corrected.

## 2026-10-08 — Workstream D Google Business quota handling hardened

- Google Business location discovery now preserves provider HTTP status, structured error reason, and `Retry-After` metadata internally without exposing provider payloads.
- HTTP 429 and structured `rateLimitExceeded`/`quotaExceeded` responses are explicitly classified as `QUOTA_EXCEEDED` by the OAuth callback.
- This does not bypass Google's quota; the current production blocker remains provider-side quota/access. Google documentation notes that some Business Profile APIs can have quota 0 until access is requested. citeturn1search0turn1search1
- Commit: `716e4d715235583e0443bc42d082a020c02271b8` plus callback classification commit `67e39e73c247a529d36fe4a0e0e94cbae707c5b4`.

## 2026-10-08 — Workstream D distributed rate-limit implementation

- Added additive migration `023_api_rate_limits.sql` and Postgres-backed `consumeRateLimit` using atomic time-window counters and HMAC-hashed bucket/identifier keys.
- Applied limits to high-cost AI Creator, weekly strategy, strategist, AI image generation, media upload, and authenticated Meta/LinkedIn/Pinterest/Google Business OAuth initiation routes.
- The limiter is intentionally serverless-safe and does not persist raw user identifiers.
- Verification remains incomplete: repository Test/Lint workflows are still red; no production migration or runtime provider verification has been performed.


## 2026-10-09 — Workstream D focused security continuation

- Fixed the distributed rate-limit regression test syntax error in `lib/security/rate-limit.test.ts`.
- Hardened Amazon product-type schema retrieval against SSRF by restricting schema fetches to HTTPS Amazon SP-API hosts and added regression coverage.
- Added rate limiting to direct Cloudinary upload initialization/completion endpoints.
- No production migration or destructive operation executed.
- Workstream D remains not production-ready: fresh CI evidence is pending; repository-wide lint debt remains; DNS-aware egress/media-processing isolation and runtime/provider verification remain open.

### 2026-10-09 — Workstream D outbound security continuation
- Hardened WooCommerce outbound requests with DNS preflight against private/local address ranges, 15s timeout, and provider-error redaction.
- Added regression coverage for private DNS resolution and provider-controlled error leakage.
- Residual DNS rebinding risk remains because preflight and connection are separate; deployment-level egress policy is still the definitive control.
- No production migration or destructive operation performed.

## 2026-10-09 — Workstream D media completion boundary hardening

- Hardened MediaService.completeDirectUpload() so a direct-upload completion cannot persist a Cloudinary resource unless its public ID is under the authenticated user's users/<userId>/ folder, its Cloudinary resource_type matches the declared MIME class, its returned format matches an allowlisted MIME/format pair, and its reported byte size is positive.
- Added lib/media/service.test.ts covering valid completion plus ownership, resource-type, format, and size mismatch rejection.
- Confirmed the application does not execute server-side video codecs/FFmpeg on uploaded video; video processing remains delegated to Cloudinary's managed media boundary.
- This is source-level hardening only. No production migration, destructive operation, or live provider mutation was performed. Fresh CI evidence remains required.


## 2026-10-09 — Workstream D CI regression follow-up

- Fresh CI runs for PR #55 completed red: Validate stopped at repository-wide lint, while Quality Checks stopped at Test.
- Validate reported the previously expected repository-wide lint debt (316 problems: 238 errors, 78 warnings) and also showed the rate-limit test parser failure in the merge ref; the branch source now contains the corrected test terminator, so a new CI run is required to confirm the merge-ref state.
- Quality Checks reported 11 failures. Most are existing Commerce/Flipkart/WooCommerce lifecycle-test drift; one Workstream D-introduced failure was the WooCommerce DNS mock being declared before Vitest mock hoisting. That test has now been corrected with vi.hoisted(...).
- The WooCommerce generic request path also still surfaced provider-controlled error messages despite the intended redaction contract. It has now been changed to return only the HTTP-status error.
- No production migration, destructive operation, credential backfill, or provider mutation was performed.
- PR #55 remains open and unmerged. CI-green and production-ready status remain unclaimed pending a fresh run.


## 2026-10-09 — Workstream D latest CI regression fixes

- Latest PR #55 CI rerun completed red, but the WooCommerce security regression tests now pass (4 request tests plus the existing 5 client tests); Amazon schema security tests also pass.
- Quality Checks still had two Workstream D test-collection failures caused by Vitest mock-hoisting in `lib/security/rate-limit.test.ts` and `lib/media/service.test.ts`. Both mocks have now been converted to `vi.hoisted(...)`.
- The remaining Quality Checks failures are existing Commerce/Flipkart/WooCommerce lifecycle drift plus the intentional fail-closed legacy credential test mismatch in scheduler coverage; these are not being broadened into Workstream D without evidence that they are regressions from this branch.
- A fresh CI run is required for the new fixes. PR #55 remains open and unmerged.

## 2026-10-09 — Pricing page missing-migration resilience
- Production `/pricing` reported PostgreSQL `42P01` (`billing_plans` does not exist), consistent with billing migration `021_billing_v1_plans_entitlements.sql` remaining unapplied to the default/live Neon branch.
- On `main`, the pricing page now falls back to the established Free/Growth/Pro display catalog when a billing relation is missing, while rethrowing unrelated database errors.
- Corrected the entitlement lookup to use the actual migration schema: `billing_plan_entitlement_values` joined to `billing_entitlement_definitions`.
- This is an availability guard, not a substitute for applying/validating migration 021. Live Neon was not modified. Build/runtime verification is still pending.


## 2026-10-09 — Dizito design-system continuation on main

- Continued the existing UI consistency work directly on `main`; no new theme or design direction was introduced.
- Aligned product detail, inventory, commerce channel/listing pages, login, contact/how-it-works, notification, account-connection error and provider account-selection screens with the shared Dizito primitives and responsive layout patterns.
- Restyled the internal billing developer console and Razorpay payment test page while retaining their existing API calls and test-only intent.
- Updated Privacy Policy, Terms of Service and Data Deletion page layout to match the established typography, spacing and card language; legal copy was retained.
- Added shared CSS responsive guardrails for narrow widths, long content and controls.
- Verification boundary: GitHub Actions is running for the latest direct-to-main commits. Earlier runs identified JSX wrapper mistakes during iterative edits; follow-up fixes were pushed. Do not treat this checkpoint as complete until the latest `Validate` and `Quality Checks` runs pass, and do not claim visual/browser validation at 320/360/390/430px without executing it.
- Scope still outstanding: route-by-route visual/browser QA across all remaining application pages and modal/component surfaces, plus any issues exposed by the current CI run.


## 2026-10-09 — Direct media API validation continuation

- Hardened `/api/upload/signature` with positive safe-integer session identity validation and runtime validation of the signed-upload request's MIME type and positive safe-integer file size before generating a Cloudinary signature.
- Hardened `/api/media/complete` with safe session identity validation, malformed/non-object JSON handling, bounded public ID/file-name/MIME fields, normalized MIME input, and a stable user-facing failure response rather than forwarding provider/database exception messages.
- Preserved per-user rate limits, Cloudinary resource lookup, user-folder ownership checks, supported format checks, upload policy limits, and MediaService's final resource verification.
- Commits: `69fb6861b8c65520ab52b763eada8a77da2e10fb` (signature request validation), `bc2d1f61021e3062cf5e257d4164c3d46f7ec333` (completion request validation).
- Verification boundary: source reviewed after commit; fresh GitHub Actions for both commits is pending. No production migration, provider mutation, deployment, or browser/runtime verification was performed.


## 2026-10-09 — Media upload policy boundary tests

- Hardened the shared `getUploadPolicy` helper to reject zero, negative, fractional, non-finite, and unsafe-integer byte sizes, and normalize MIME strings with whitespace trimming before policy matching.
- Added `lib/media/upload-policy.test.ts` coverage for supported image/video MIME types, size boundaries, invalid sizes, and unsupported MIME types.
- Commits: `bd0cca3beeb37f5baf48229ae6d8726a78bc8057` (policy validation), `59d79ecc272e5c3dfb73290abdd1a6436c48a56e` (tests).
- The preceding direct upload API and documentation commits have both Validate and Quality Checks passing. CI for this policy/test addition is pending; no production migration, deployment, or provider mutation was performed.


## 2026-10-09 — Media signature normalization

- Normalized declared MIME strings by trimming whitespace and lowercasing before checking media magic-byte signatures. The accepted signature map remains unchanged, so this does not expand supported upload formats.
- Added regression coverage for MIME whitespace/casing normalization.
- Commits: `c34577e3347526d41f514fe9474e84d7cec4f83f` (normalization), `ddd68e850f903319d5fc15f965428f43c286a553` (test).
- Earlier upload policy, policy-boundary tests and documentation CI runs passed. CI for signature normalization is pending. No deployment, production database change, or provider mutation was performed.


## 2026-10-09 — WooCommerce product context in Marketing Content

- Extended weekly-plan approval to persist selected WooCommerce products as external product references inside each generated content item's planning_metadata; references remain distinct from Dizito's canonical products IDs.
- Marketing Content now displays linked WooCommerce product name, external ID, optional SKU, price snapshot, stock-status snapshot, and a product link. The UI labels these as planning-time snapshots and reminds users to verify current price and availability before publishing.
- Approval API validates external references and enforces field/array limits plus HTTPS-only permalinks. No WooCommerce write calls, publishing, or production data mutations were introduced.
- CI for implementation commits 23868b5, 3775698, and 6570cf9: both Validate and Quality Checks passed on the latest approval-flow commit. This UI follow-up is awaiting CI; browser/runtime validation remains pending.


## 2026-10-09 — Close the weekly approval-to-review loop

- After a weekly plan is approved, Generate My Week now exposes a direct “Review content items” action to open Marketing Content. Approval still does not publish posts.
- Both Validate and Quality Checks passed for the previous WooCommerce planning-context UI/doc commits. This navigation follow-up is awaiting CI; browser/runtime testing has not been performed.


## 2026-10-09 — WooCommerce product-reference regression coverage

- Extracted bounded validation for provider-owned external product references into `lib/marketing/externalProductReferences.ts` and added Vitest coverage for valid snapshots, optional fields, empty lists, invalid IDs/names, list/field limits, and HTTPS-only permalinks.
- Weekly-plan approval route now calls the tested helper and returns its validation errors as HTTP 400. External WooCommerce identifiers remain planning metadata, separate from canonical product IDs.
- Commits: `b3b7015` (helper), `91bc97d` (tests), `483e9e5` (route integration). CI was triggered; confirm results before treating this checkpoint as verified. Browser/runtime end-to-end QA remains pending.


## 2026-10-09 — Add WooCommerce catalog to canonical product detail

- Added a WooCommerce section to `app/products/[id]/page.tsx`, matching the existing Shopify and Amazon product workflow placement. It loads the merchant's WooCommerce channels, allows choosing a connected store, and reads its products through the existing authenticated, tenant-scoped, paginated read-only catalog API.
- Catalog rows show WooCommerce product ID, name, SKU, type, status, price, stock status, and a validated HTTP(S) product permalink. Includes search within the current page, refresh, pagination, loading, empty, and error states. If no store is connected, it links to Commerce Channels.
- Deliberately does not create a persistent canonical-to-WooCommerce mapping or mutate the store. That needs a separate explicit mapping workflow and must not be implied by simply browsing a similarly named product.
- Commits: `83bb947` (component), `735bbea` (product page integration). CI and browser verification pending.


## 2026-10-09 — Persist explicit WooCommerce product links

- Extended the product-page WooCommerce catalog with an explicit “Link to this product” action. It persists the selected WooCommerce external ID on the existing provider-neutral `product_listings` row and stores a bounded provider snapshot in listing metadata; the UI reloads and displays the current link.
- Added authenticated `POST /api/commerce/woocommerce/link`. It verifies tenant ownership of the canonical product and WooCommerce channel, confirms the exact external product by reading it from the connected store, rejects cross-product identity conflicts, serializes concurrent attempts for the same channel/external ID, and writes transactionally. Listing remains `draft`/`pending`; this action does not publish or mutate WooCommerce.
- A different existing external ID for the same canonical product/store is rejected rather than silently replaced. No schema migration or production-store mutation was needed.
- Commits: `7df3ece` (API), `8ec834c` (UI), `cf44480` (serialize conflicts). CI and browser/API runtime verification pending.


## 2026-10-09 — WooCommerce product linking verified

- Persistent canonical-product ↔ WooCommerce product linking is implemented on `main`. The catalog row has an explicit link action; mappings are stored in Dizito's existing `product_listings` table with provider metadata and are reloaded from persisted listings.
- User confirmed linking and persistence were validated in the running application. GitHub Actions Validate and Quality Checks both passed for commit `e040cb864030c28c1ff26b6389d1f5f8b1e9d506` (runs [37970471607](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37970471607) and [37970471741](https://github.com/rohansharma111/dizito-scheduler/actions/runs/37970471741)).
- Link endpoint verifies tenant ownership and the external product by read-only WooCommerce API lookup, protects external-ID conflicts with a transaction lock, and stores the mapping as draft/pending. It does not create/update/publish anything in WooCommerce. No migration was needed.
- Next: continue the controlled WooCommerce workflow with explicit review of draft preparation, validation, publish guards/idempotency, and reconciliation. Keep provider-side mutations disabled unless using an approved test product/store and an explicitly authorized publish test.


## 2026-10-10 — WooCommerce product-page publish workflow UI

- Added a dedicated WooCommerce publishing panel to the canonical product details page, separate from the read-only store catalog/linking panel.
- The UI loads connected WooCommerce channels, prepares a draft through the existing authenticated draft API, shows a listing preview, and requires an explicit staging-store confirmation before calling the existing publish API.
- Added an idempotency key for publish attempts and a reconciliation action for uncertain outcomes. UI copy warns users not to retry an uncertain publish before reconciliation.
- Uses the first canonical variant as the required listing association; products without variants are asked to add one before preparing a listing. Price and SKU are editable before draft preparation.
- No migration, credentials, or live-store changes were made. The UI is committed to `main`; CI and staging runtime verification must pass before calling the end-to-end workflow tested.


## 2026-10-10 — WooCommerce publish reconciliation verified

- User confirmed the local listing is linked to WooCommerce product ID `2800` and the local listing/publish-attempt records reflect the reconciled success state.
- Reconciliation returned `published`; do not retry or republish this item. Treat WooCommerce product `2800` as the existing external product to avoid duplicate creation.
- Production Neon schema was updated and verified: `product_listings.publish_idempotency_key`, the channel-scoped unique idempotency index, and `commerce_publish_attempts` with status constraints and indexes are present.
- The user-verified listing link and success state are recorded; retry/replay behavior and broader end-to-end CI/browser coverage remain separate verification items.


## 2026-10-10 — Homepage positioning update proposed (branch; not merged)

- Proposed public positioning: Dizito is a commerce + marketing operating system, not only a social media scheduler.
- Homepage now introduces a clear four-stage operating loop and presents Shopify/WooCommerce separately from Amazon/Flipkart/Meesho in-progress work.
- AI is described as coming soon where relevant; manual marketing workflows and explicit review/approval are not represented as AI-dependent.
- Branch: `v1/ai-commerce-positioning`. No merge yet. CI and browser/mobile QA are pending.
- Provider status remains mixed: WooCommerce product ID 2800 was reconciled as published and user-verified; Shopify is documented as the most mature integration; Pinterest Standard Access is granted but current-build live verification is pending; Meta and Google Business remain external approval/access dependencies; Flipkart controlled provider verification remains pending; Meesho is blocked on authoritative partner/API access; Amazon has catalog/offer foundations rather than complete marketplace readiness. LinkedIn's current-build publishing status needs direct verification before making an unconditional public claim.


## 2026-10-10 — Marketing Workspace guided entry point on main

- Homepage positioning PR #64 was merged as `368cc392697112651a10c521f3530f45c048f8d3`; PR Validate and Quality Checks both passed on its head commit.
- Added `/marketing-workspace` to address navigation/process confusion. It explains the recommended journey in plain language and links to Business Brain, weekly planning, content review, connected channels, and Business Impact. Added direct shortcuts to products, commerce channels, and the product guide.
- Sidebar now exposes Marketing Workspace as the first START HERE destination; AI WORKSPACE was renamed PLAN & CREATE, and ASSETS & DISTRIBUTION was renamed PUBLISH & MANAGE.
- Latest workspace/sidebar commits are source-reviewed only. Run CI, lint/typecheck/build, and responsive browser QA before marking the new guided experience verified. No backend contracts or provider behavior changed.


## 2026-10-10 — Onboarding clarity refinement

- Marketing Workspace now routes first-time users to the existing data-backed `/onboarding` checklist rather than duplicating progress state.
- Onboarding copy explains the business setup purpose and clearly distinguishes manual weekly planning available now from AI-powered strategy coming soon.
- Main commits: `b6c658f51086c9694c7b5c073224432eac9df708`, `277ea3c0161b72761707af86ff305bac508f04ea`.
- Latest workspace and onboarding changes still need CI/build and desktop/mobile visual verification.


## 2026-10-10 — Setup checklist accuracy

- Corrected onboarding progress so creating a post no longer falsely marks “Add goals, products & offers” complete. That step now checks saved goals, products or offers from Business Brain.
- Commit: `1f8e9f5ffe04b4c06327fcab702a15d9f180bd4b`. CI and browser verification remain pending.
