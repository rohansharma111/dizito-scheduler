# V1 Pre-Screen QA Readiness

**Status:** Preparation only; no browser/runtime screen testing has been performed.
**Baseline:** main at dashboard-sidebar merge commit e4b318575fd50c9ff27c7bcfe8e961c339d69de0.
**Purpose:** establish a safe, repeatable preflight before the V1 merchant journey is tested screen by screen.

## Evidence rules

Keep these statuses distinct in every report:

- **Implemented:** source code exists.
- **Automated-test verified:** a specific test/check passed on an identified SHA.
- **Runtime verified:** the flow was exercised in a running deployment/local environment and evidence was captured.
- **Provider verified:** the operation was exercised against the intended external provider environment.
- **Unknown / blocked:** evidence or access is missing. Do not infer success from missing workflow results.

## Preflight checklist

- [ ] Confirm deployed environment URL and deployed Git SHA; ensure it matches the intended release.
- [ ] Obtain fresh CI results for the exact target SHA: npm ci, npm run lint, npx tsc --noEmit, npm test, and npm run build. Record each result separately.
- [ ] Verify application environment/configuration readiness without exposing secret values in logs or documents.
- [ ] Verify database connectivity and read-only migration/index state. Do not run migrations as part of browser QA.
- [ ] Prepare a dedicated test merchant and confirm tenant isolation using a second test identity.
- [ ] Seed representative products, services, offers, and safe media fixtures.
- [ ] Confirm designated sandbox/test credentials for external providers. Keep live provider mutations disabled unless separately authorized and verified.
- [ ] Capture baseline screenshots and browser console/network logs; redact tokens, cookies, PII, and provider secrets.
- [ ] Confirm rollback/cleanup procedure for test-created records and test-cloud assets.

## Screen-by-screen test order

For every screen, record route, test identity/fixture, timestamp/environment/SHA, expected result, actual result, screenshot/evidence, console/network failures, and defect severity.

| Order | Journey | Required checks |
|---|---|---|
| 1 | Authentication and onboarding | Sign-in/out, required fields, invalid input, session persistence, protected-route behavior |
| 2 | Business Brain | Save/edit context, validation, empty/loading/error states, reload persistence |
| 3 | Products, catalog, offers, media | Create/edit validation, media limits and MIME handling, tenant ownership, reload persistence |
| 4 | Connected accounts and channels | Connected/disconnected/error states; OAuth/provider mutations only in approved sandbox |
| 5 | Strategist | Empty context, generation errors, evidence and recommendation presentation |
| 6 | Generate My Week | Generate, loading/error, plan consistency, repeat behavior |
| 7 | Content review and approval | Edit/review gates, approval state, persistence, unauthorized bypass checks |
| 8 | Creator and channel variants | Required content, variant provenance, platform-specific constraints, failure states |
| 9 | Calendar, scheduling, publishing | Time zones, validation, duplicate/retry behavior, scheduling state; no unapproved live publish |
| 10 | Customer Actions and attribution | Input validation, tenant scoping, attribution evidence vs. causal claims |
| 11 | Business Impact and Optimizer | Empty/observed outcomes, evidence grounding, recommendation disposition and persistence |

## Stop conditions

Stop the affected test and record a blocker if:

- the deployed SHA/environment cannot be identified;
- a test could mutate a live provider account or publish to real customers;
- test identities can read or mutate another tenant's data;
- migration/schema state differs from the expected release;
- secrets or sensitive customer data appear in screenshots/logs;
- an operation's outcome is ambiguous and retrying could duplicate a side effect.

## Current known gaps

- The dashboard sidebar visual change is merged to main; the merge itself does not establish visual browser acceptance.
- No CI run or combined status was returned for the dashboard merge SHA at the time this checklist was prepared. Treat CI as unknown until a fresh result is observed.
- Browser/runtime merchant-journey QA has not been performed.
- Controlled Cloudinary test-cloud verification remains pending; provider-side pre-ingestion upload-size enforcement is not proven.
- Do not state V1 launch readiness until evidence for each relevant gate has been recorded.
