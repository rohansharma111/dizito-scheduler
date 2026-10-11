# Dizito Provider Verification Matrix

**Status:** Active external/runtime verification tracker  
**Last updated:** 2026-10-07

> Provider access approval, source implementation and runtime verification are separate states. Never convert one into another without evidence.

| Provider | Code foundation | External access | Runtime verification | Current next step |
|---|---|---|---|---|
| Meta | Strong | `business_management` review in progress | Pending external customer-like verification | Wait for review; then test Business Portfolio Page discovery + FB/IG publish |
| Pinterest | Strong | Standard Access granted | Pending current-build live verification | Verify real image Pin; then video Pin |
| Google Business | Foundation present | API application not yet complete | Pending | Apply for API access; continue code in parallel |
| LinkedIn | Existing publishing foundation | Existing developer access | Needs controlled verification | Test real image + video paths |
| Shopify | Mature | Available | Historically strong; current regression still required | Maintain, verify only if touched |
| WooCommerce | Hardened foundation | Store credentials/test environment required | Pending controlled mutation verification | Create/update/reconcile real test product |
| Amazon | Product/catalog foundation | SP-API/LWA path available | Product/content history exists; broader current verification pending | Product-type/catalog/offer regression, then controlled publish |
| Flipkart | Hardened adapter | Sandbox/provider environment | Provider response behavior not fully verified | Controlled sandbox test + authoritative response evidence |
| Meesho | Provider-neutral only | No authoritative contract/access | Blocked | Do not implement provider-specific behavior until access/docs exist |

## Verification protocol

For each provider:
1. connect using an authorized account;
2. verify tenant binding;
3. create/draft where applicable;
4. publish only when explicit live/sandbox authorization exists;
5. capture provider external ID;
6. verify persisted state;
7. retry/replay;
8. simulate/observe failure;
9. reconcile;
10. disconnect/reconnect;
11. verify logs contain no secrets.

## Meta

Current App Review state:
- `business_management`: review in progress;
- existing permissions include Instagram publishing/basic, Facebook Page publishing/list/read engagement and public profile access according to the submitted state.

Important:
- developer-role success is not proof of external customer authorization;
- Business Portfolio Page discovery is the specific reason for the new `business_management` request;
- after approval, test a non-developer/customer-like account.

## Pinterest

Standard Access is granted.

Required next verification:
- live image Pin;
- board targeting;
- returned Pin ID;
- persisted publish state;
- reconnect;
- retry.

Video requires separate verification because provider media processing differs from image Pins.

## Google Business

External prerequisite:
- submit the Business Profile API access request;
- satisfy Google's current project/profile prerequisites;
- wait for approval.

Do not claim API production readiness before access and a controlled end-to-end test.

## Commerce provider verification

### WooCommerce
Test:
- create;
- update;
- variant;
- price;
- inventory;
- provider read-back;
- ambiguous outcome;
- retry;
- duplicate/replay;
- disconnect.

### Amazon
Test:
- multiple product types;
- complex conditional schemas;
- catalog match;
- matched ASIN persistence;
- new-product path;
- offer mapping;
- variant mapping;
- publish/update;
- reconciliation.

### Flipkart
Test:
- authorized sandbox;
- exact response shape;
- provider external ID;
- replay/idempotency;
- reconciliation;
- mismatch handling;
- live mutation remains fail-closed unless explicitly authorized.

### Meesho
Blocked.



### Workstream C reconciliation — 2026-10-08

The media/video implementation has been reconciled onto the current main lineage. This does not change provider verification status.

Current media verification boundary:
- Instagram Reel/video workflow: provider constraints verified from official documentation; current-build live publish verification remains pending.
- Pinterest video Pin workflow: official register → multipart upload → processing-status → Pin creation sequence verified; current-build live video Pin verification remains pending.
- LinkedIn video workflow: official initialize/upload/finalize/availability sequence verified; current-build live publish verification remains pending.
- Facebook video: remains fail-closed because current implementation-level provider verification is incomplete.
- Google Business video: remains fail-closed; do not advertise generic Local Post video support.

Provider access authorization and provider runtime mutation verification remain separate gates.

## 2026-10-11 — Current provider-control UI checkpoint

The current main UI checkpoint standardizes provider-aware controls for Commerce Channels, WooCommerce catalog linking, Amazon catalog matching, Amazon listing validation, and Amazon offer validation. This is presentation and action-label consistency only; it does not change provider verification status in the matrix above.

- Current checkpoint: `9253a76d39995cf81b2c47aea998e66bd9d95143`.
- Validate: passed https://github.com/rohansharma111/dizito-scheduler/actions/runs/38110135930.
- Quality Checks: passed https://github.com/rohansharma111/dizito-scheduler/actions/runs/38110135879.
- Still required: review every remaining legacy provider control, run desktop/mobile browser checks, and perform the provider-specific runtime tests listed above using explicitly authorized test/sandbox accounts.
- No live provider mutation was performed by this UI pass. Do not infer production readiness from these CI runs.
