# Dizito V1 Launch Plan

**Status:** Active launch plan  
**Last updated:** 2026-10-07  
**Repository:** `rohansharma111/dizito-scheduler`

> This document converts the current repository state, database inspection, provider-access state, product strategy, security findings, UI requirements, and external dependencies into a concrete V1 Beta execution plan. It is a planning document, not a claim that every gate is already verified.

## 1. V1 definition

Dizito V1 Beta is successful when a real merchant can:

1. create an account;
2. establish business context / Business Brain;
3. add products, services, offers and media;
4. connect supported distribution channels;
5. receive AI strategy;
6. generate a weekly plan;
7. review/edit AI-generated content;
8. approve content;
9. create platform-specific variants;
10. schedule/publish;
11. observe customer actions;
12. inspect Business Impact;
13. receive evidence-grounded optimization recommendations;
14. return the following week and repeat the loop.

The V1 promise is the complete marketing operating loop, not completion of every commerce marketplace integration.

## 2. Current launch position

### Strong foundations
- Core Next.js application and protected dashboard.
- Marketing domain/API foundations.
- Business Brain, Strategist, Generate My Week, Creator, review gates, Customer Actions, Business Impact and Optimizer foundations.
- Pinterest Standard Access granted.
- Meta `business_management` App Review submission is in progress.
- Google Business Profile API remains an external application/approval dependency.
- Neon Postgres is the current database and is very small at present.
- Vercel is the current application host/deployment platform.
- Cloudinary is the current media platform.
- Shopify is the most mature commerce integration.

### Launch blockers / high priority
- Marketing UI must become a coherent, complete merchant experience.
- Dizito needs a distinctive design system/brand language rather than generic dashboard styling.
- Subscription/pricing model must be redesigned around the current AI marketing + commerce product, not the historical social scheduler.
- Security audit must verify actual credential storage, tenant isolation, OAuth, webhook, upload, logging and rate-limit behavior.
- Video publishing must become a first-class, platform-capability-driven feature rather than treating every video as an image.
- External Meta/Pinterest/Google/provider verification must be completed where required.
- Fresh CI/test/lint/build evidence is required before production-readiness claims.
- Beta onboarding and error/recovery UX need a final pass.

## 3. Recommended engineering order

### Phase A — Product/UI audit
Map every V1 user journey and every screen into:
- implemented;
- incomplete;
- broken;
- missing loading state;
- missing empty state;
- missing error state;
- missing retry state;
- missing permission/disconnected state;
- missing plan-limit state;
- mobile/responsive issue.

### Phase B — Dizito design system
Create reusable visual primitives and apply them to the primary V1 surfaces:
- dashboard;
- Business Brain;
- Generate My Week;
- content review;
- media;
- channels/accounts;
- analytics/Business Impact;
- billing;
- onboarding.

The goal is not decorative styling. The UI must communicate Dizito as an AI business operating system.

Recommended reusable primitives:
- buttons;
- cards/panels;
- status badges;
- metrics;
- AI insight/recommendation cards;
- channel badges;
- timelines;
- content previews;
- empty/error/success states;
- command/action bars.

### Phase C — Marketing V1 completion
Complete the merchant path end-to-end and ensure every persistence path respects:
- tenant ownership;
- human review;
- fail-closed malformed AI output;
- explicit attribution;
- durable execution provenance.

### Phase D — Subscription/pricing redesign
Move from plan names and provider plan IDs being the main application model to:
`billing plan → entitlements → subscription → provider mapping → usage`.

The current billing code has Creator and Agency plans tied to Razorpay plan IDs. The new model should support:
- trial;
- monthly/annual interval;
- active/inactive plans;
- feature entitlements;
- usage limits;
- AI usage;
- channel limits;
- publishing limits;
- analytics;
- Business Brain;
- Strategist;
- Generate My Week;
- Creator;
- Optimizer;
- commerce capabilities;
- upgrade/downgrade;
- cancellation;
- failed payment/grace period;
- grandfathered pricing.

For beta, one user can continue to represent one business/workspace. Do not perform a full multi-workspace migration before beta unless required by an actual user journey.

### Phase E — Video/media
Keep Cloudinary, but move toward direct client-to-Cloudinary upload for large media instead of buffering large videos through the application API.

Introduce a provider/platform media capability model:
- image/video;
- carousel;
- reel/story/video-pin where supported;
- MIME/size/duration/dimension limits;
- upload protocol;
- processing/polling requirements;
- cover/poster requirements.

The publishing architecture should select a platform-specific workflow after content creation, not assume a single generic media URL.

Current important platform distinctions:
- Instagram video/reel requires a video-specific Meta workflow and processing state.
- Facebook should have separate photo/video publishing paths.
- Pinterest video requires media registration/upload/processing and then Pin creation using the processed media plus cover data; Pinterest sandbox does not provide full video-Pin creation verification.
- LinkedIn video requires its own upload/register workflow.
- Google Business must distinguish Local Post media from Location media; do not expose unsupported video behavior as a generic Local Post capability until externally verified.

### Phase F — Security and observability
Before external beta:
- verify token/credential encryption at actual write/read boundaries;
- audit every API route for session + tenant/resource ownership;
- audit OAuth state/PKCE/redirect/replay behavior;
- verify webhook signatures;
- add rate limiting to auth/OAuth/AI/upload/publish/billing/webhook surfaces;
- validate uploaded files by size, MIME and actual content/metadata;
- sanitize logs;
- audit dependency vulnerabilities;
- review security headers and error leakage;
- enable query observability and investigate slow paths.

### Phase G — External verification
Track provider access and runtime verification separately.

Meta:
- `business_management` App Review is in progress;
- after approval, verify an external/customer-like Business Portfolio Page discovery path, Facebook publishing, Instagram discovery/publishing, reconnect and failure handling.

Pinterest:
- Standard Access is granted;
- perform live external image Pin verification;
- separately implement/verify video Pin behavior.

Google Business:
- apply for API access now;
- implement account/location/posting/reconnect flow in parallel;
- verify only after API access is granted.

Commerce:
- Shopify is sufficiently mature for V1 context.
- WooCommerce: controlled real-store verification.
- Amazon: catalog/offer regression and controlled verification.
- Flipkart: controlled sandbox/provider verification and authoritative response evidence.
- Meesho: blocked until authoritative API/partner access exists.

## 4. Pricing direction

The historical pricing model was designed around social publishing. It no longer describes the current product.

Recommended beta structure (strategy, not yet implemented):
- Free: discovery/basic usage.
- Growth: approximately ₹799/month as the primary beta paid tier.
- Pro: approximately ₹1,999/month for more channels, AI, analytics, optimizer and commerce capabilities.
- Agency: approximately ₹4,999+/month for multi-business/team workflows.

Recommended founding-beta offer:
- approximately ₹499/month;
- founding price locked while continuously subscribed.

The exact prices must be validated against:
- AI inference cost;
- media/storage/bandwidth cost;
- provider/API costs;
- payment fees;
- target customer willingness to pay;
- actual usage.

Do not hard-code pricing assumptions into provider code.

## 5. Subscription architecture direction

Longer-term target:
`Business/Workspace → Subscription → Billing Plan → Entitlements → Usage`.

Keep provider-specific Razorpay IDs in provider mapping, not throughout business logic.

Potential future tables:
- billing_plans;
- billing_plan_entitlements;
- provider_plan_mappings;
- subscriptions;
- billing_events;
- usage/counters.

Avoid duplicating authoritative subscription state across user columns and subscription records unless there is a deliberate cache/compatibility reason.

## 6. Scalability / infrastructure

Current stack remains appropriate for beta:
- GitHub;
- Vercel;
- Neon Postgres;
- Cloudinary;
- Razorpay;
- provider APIs.

Current Neon observation (2026-10-07):
- database size approximately 12 MB;
- 46 public tables;
- 156 public indexes;
- current data volumes are tiny;
- largest current tables are webhook/event/payment/log tables, not catalog tables.

Conclusion:
- database is nowhere near a storage limit;
- no database migration is currently justified;
- future growth risk is event/log volume and query/index behavior, not current storage;
- use retention/aggregation for high-volume event tables before considering partitioning;
- enable `pg_stat_statements`/query observability before serious scale claims.

Scalability status:
**beta-scale architecture is plausible; production-scale capacity is not yet proven.**

Future scale boundary:
`Vercel API → durable job queue → workers → provider APIs → reconciliation`.

Do not turn Vercel request handlers into long-running background workers.

## 7. Launch quality gates

### Product
- [ ] complete merchant onboarding;
- [ ] Business Brain;
- [ ] products/services/offers/media;
- [ ] channel connection;
- [ ] Strategist;
- [ ] Generate My Week;
- [ ] review/edit;
- [ ] approval;
- [ ] scheduling;
- [ ] publishing;
- [ ] Customer Actions;
- [ ] Business Impact;
- [ ] Optimizer.

### Reliability
- [ ] retries;
- [ ] ambiguous outcomes;
- [ ] duplicate prevention;
- [ ] provider reconciliation;
- [ ] disconnected-account handling;
- [ ] reconnect;
- [ ] tenant isolation.

### Security
- [ ] credential encryption verified;
- [ ] API authorization audit;
- [ ] OAuth security audit;
- [ ] webhook verification;
- [ ] upload validation;
- [ ] rate limiting;
- [ ] log sanitization;
- [ ] dependency/security review.

### Billing
- [ ] new plan model;
- [ ] entitlements;
- [ ] trial;
- [ ] upgrade/downgrade;
- [ ] cancellation;
- [ ] failed payment;
- [ ] grace period;
- [ ] billing UI;
- [ ] usage enforcement.

### UI
- [ ] Dizito design system;
- [ ] responsive/mobile;
- [ ] loading/empty/error/success states;
- [ ] disconnected/permission states;
- [ ] plan-limit states;
- [ ] platform-specific content previews.

## 8. Estimated time

These are planning estimates, not commitments:
- UI audit: 2–4 engineering days;
- design system + primary surfaces: 3–7 days;
- marketing V1 completion/hardening: 1–2 weeks;
- subscription/pricing redesign: 4–7 days;
- video foundation + first platform implementations: 1–2 weeks;
- security pass: 4–7 days;
- observability/scalability pass: 3–5 days;
- external verification: runs in parallel and is dependent on provider approvals/test environments.

Focused execution could reach private beta readiness in roughly 4–6 engineering weeks. Public V1 should be expected after another validation cycle, roughly 6–10 weeks total. The full AI Commerce Operating System is an ongoing multi-quarter roadmap, not a finite V1 milestone.

## 9. Definition of “fully complete”

Do not use “fully complete” to mean every provider exists.

Long-term completion means a mature operating system with:
- marketing flywheel;
- multi-provider commerce;
- durable synchronization;
- orders/inventory/fulfillment;
- measurement/attribution;
- experimentation;
- workspaces/teams;
- secure automation;
- advanced AI commerce workflows.

This is expected to evolve over multiple quarters.

## 10. Decision rule

When choosing the next feature, ask:

**“What prevents a real merchant from successfully using Dizito every week?”**

Prefer work that removes that blocker over adding another integration or speculative AI feature.


### Phase E.4 — Media/video reconciliation — 2026-10-08

Workstream C has been reconciled onto the current main lineage without discarding newer parallel-workstream changes.

The implementation now carries forward:
- first-class image/video media modeling;
- signed direct Cloudinary upload for large video;
- processing/lifecycle metadata and poster support;
- provider-specific video publishing workflows;
- fail-closed behavior for unsupported or incompletely verified capabilities;
- media ownership/readiness enforcement at post creation and edit boundaries.

Launch gates remain:
- apply the additive media migration through the normal database migration process;
- run current focused and repository validation suites;
- perform controlled Instagram, Pinterest and LinkedIn video runtime verification;
- retain Facebook/Google video fail-closed behavior until their verification boundary changes.
