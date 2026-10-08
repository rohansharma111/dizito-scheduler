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

### Pinterest video upload implementation note — 2026-10-08

The current publisher follows Pinterest's documented video-Pin sequence: register `/media`, multipart-upload the video using returned upload parameters, poll `GET /media/{media_id}` until success, then create the Pin with `source_type=video_id`, `media_id`, and a valid `cover_image_url`. citeturn0search0

The application handoff from Cloudinary has been changed to stream the video rather than buffer the entire asset in memory. This is source-level hardening only; it does not constitute provider runtime verification.

Current verification status remains:
- Standard Access: granted;
- image Pin live verification: pending;
- video Pin live verification: pending;
- current-build end-to-end video verification: required before production readiness.
