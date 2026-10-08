# Dizito Implementation Log

## 2026-10-07 — Workstream C: first-class media/video capability

Branch: `v1/media-video`

Implemented:
- capability contract for image/video/reel/video Pin and Google Business location media;
- explicit MIME/size/duration/dimension/processing/polling/cover/upload-protocol metadata;
- additive `media_library` video lifecycle migration;
- signed direct Cloudinary video upload initialization and tenant-verified completion;
- buffered video upload fail-closed behavior;
- Instagram Reel processing polling and publication;
- separate Facebook image/video publishing paths;
- Pinterest video Pin registration/upload/status polling/cover publication;
- LinkedIn Videos API ranged upload/finalize/status polling/Posts publication;
- Google Business Local Post video rejection and separate photo-only location-media publisher;
- video-aware product media rendering;
- capability, state-transition and upload-policy regression tests.

External evidence used for implementation:
- Pinterest official API documents image/video Pins and the register → upload → media-status → create-Pin flow with required cover image.
- LinkedIn official Videos API documents 3-second–30-minute, 75 KB–500 MB MP4 feed videos and initialize → ranged upload → finalize → status lifecycle.
- Google official Business Profile docs distinguish Local Posts from location media; the current v4 location-media reference lists PHOTO as the supported MediaFormat, so Dizito fails video closed there. Current verification also confirms Instagram Reels (3 seconds–15 minutes, up to 1 GB), Pinterest video Pins (register/upload/status/cover), and LinkedIn feed video (3 seconds–30 minutes, 75 KB–500 MB MP4).
- Cloudinary official docs support video-to-JPG thumbnail/poster delivery from the video public ID.

Verification:
- Source/schema audit completed against current `main` and Neon `media_library`/`posts` schemas.
- Focused tests were added but not executed because the GitHub repository could not be cloned into the local execution environment.
- No live provider mutation was performed.
- Neon migration was not applied to the default branch; repository migration is the source-of-truth change pending controlled application.
- Provider access/runtime readiness remains separately tracked.

---

## 2026-10-07 — Google Business Profile API access request submitted

- **Status:** Pending Google allowlisting/approval; provider runtime verification has not started.
- Dizito confirmed the Google Business Profile API prerequisites and submitted the current **Basic API Access** application.
- Google Cloud project number submitted: `250265818721`.
- Company website submitted: `https://www.dizito.in/`.
- The application describes Dizito as a customer-authorized SaaS platform that will let customers connect and manage their own Google Business Profiles through Google's OAuth flow.
- The application answered **No** to whether the organization already had an active, allowlisted Google Cloud Project ID; the project currently shows `0` requests/minute before approval.
- Google opened support case **`0-3242000041809`** and stated an approximate review time of **7–10 business days**.
- No duplicate project or duplicate application should be created while this request is pending.
- Verification boundary: the Google approval request is external provider authorization work. It does not yet verify Dizito's OAuth connection, location discovery, or live Business Profile post publishing.
## 2026-10-07 — Pinterest Standard Access granted

- External provider status: Pinterest Standard Access has been granted for Dizito.
- The Pinterest integration is now authorized to publish Pins publicly through the approved API access level.
- This removes the previous Pinterest Standard Access/pending-approval blocker.
- Verification boundary: this is provider-access authorization confirmed by the user; it does not claim a live end-to-end Pin publication has been executed from the current application build.

# Dizito Implementation Log

## 2026-10-07 — Build/type repair and validation checkpoint

- Current `main`: `98a1610ee149f3ed33cfacdd42ca0648e7a58a87`.
- Sequential TypeScript/build repair pass completed across Marketing, Flipkart and Shopify paths.
- Flipkart repairs covered adapter error-code narrowing, prepared-payload narrowing/validation, and restoration of `FlipkartEnvironment`.
- Shopify listing-sync claim handling now carries an explicit claim through the publish workflow and releases it only at the appropriate terminal state; recovery records the recovered external ID under an owned claim before normal sync.
- Latest commit reports successful Vercel status. No fresh GitHub Actions quality run is exposed for the direct push, so repository-wide test/lint success is not claimed.
- `merge/meesho-into-main` is 635 commits behind `main` and 0 ahead; no changes are pending from that branch.



**Purpose:** chronological durable record of meaningful implementation, architecture, verification and scope decisions.  
**Repository:** `rohansharma111/dizito-scheduler`  
**Latest observed main:** `98a1610ee149f3ed33cfacdd42ca0648e7a58a87`  
**Last refreshed:** 2026-10-07

## 2026-10-06 — Current-state consolidation

- Status: Documentation refreshed.
- Scope: synchronized `AGENTS.md`, `docs/PROJECT_STATUS.md`, and this Codex context with the current repository direction.
- Current architecture now explicitly recognizes:
  - provider-neutral commerce dispatch;
  - WooCommerce and Flipkart as active hardening targets;
  - Amazon catalog/offer foundation;
  - marketing AI grounding/review/optimizer workflows;
  - Meesho as externally blocked.
- Verification limitation: documentation was reconciled from repository source and git history; no claim of fresh repository-wide runtime verification is made.

## 2026-10-06 — Flipkart publish confirmation safety

- Commits:
  - `5a0e73273b5ac168f1088e583fd70e90519babc2` — harden publish confirmation path
  - `82becf4460275587fce22788f4cbc8c92c26bf2b` — remove direct confirmation bypass
  - `398ddd435bc31addcae6fb5b181b0a1a94230081` — update publish safety audit
- Implemented:
  - canonical reconciliation is the intended path to publish success;
  - provider lookup must produce a concrete external listing identifier;
  - caller-supplied external IDs cannot independently confirm success;
  - direct confirmation helpers that could bypass provider reconciliation were removed;
  - `FLIPKART_LIVE_PUBLISH_ENABLED` remains fail-closed.
- Verification:
  - source inspection completed;
  - live/sandbox mutation not run;
  - runtime CI/build/lint/type verification remains unclaimed.

## 2026-10-06 — Flipkart provider dispatch, state and route hardening

- Provider cutover:
  - `947f89b3e5757989db58df2b52ad1c1f924e5349` — draft route
  - `9e81aad54e501bb5022358bd1ec5efdf4d09be6c` — publish route
  - `ea597b01cd129daeb138ceeef0f99e7db24f56ef` — reconcile route
  - `6332539d9f096c1b78ba9b8c030d436541d4e937` — provider lookup required for reconciliation
- Adapter/contract work:
  - `d5f02523b886595dec3707d42156ae025c3b16ce` — Flipkart provider adapter
  - `ff78a740af4f42087086c3241b8b47e1abde9992` — provider registration
  - `63aaf6b5bb302eb4358aae14a41e74ae18ae34d9` through `e73340925bed949a066fa8e05335ad4f155ee5e6` — reconciliation contract alignment/identity normalization.
- Hardening:
  - `04d68fc7744a28c0cb75b0d12ae00db9c7bde344` — persist confirmed external listing identity
  - `8252024b781ed12596d309d9848f3b51b974153c` — reconciliation persistence safety tests
  - `5552f59c1d5147e4e62c9162ba4f662843c0bf07` — terminal publish transitions
  - `4a29c439633e2d901e0c73c583e487daa1c11ff8` — prevent duplicate mutation on successful replay
  - `a73c0c312444e991ac37c8b3355822c6648cb952` — replay/state regression tests
  - `f613cb6308785908f94851a2269049396724e6ab` — idempotency conflicts classified correctly
  - `5e9dd809ec0beb8009c5122d0c4c8abd3ec0b91a`, `f638434e2c5e4d492f30ca017d78a045c36a5fcf`, `e0cd0ef753c355364292590ad8f593253bd1aad8` — route boundary tests
  - `5a90761a372d47b621a4529cfe7182344b920535`, `54e465641baf2deaa420bbb0e9a79e5c5a849e69` — provider dispatch/idempotency conflict coverage.
- Verification limitation:
  - repository/source inspection and test code are present;
  - no fresh green CI result or provider mutation evidence is claimed.

## 2026-10-06 — Provider-neutral commerce orchestration

- Commits:
  - `3108264c8a4c90025e7779119b55af7f3ffb1cec` — provider-neutral adapter contracts
  - `7e0bb4728f67fcf1230bd6e88a62926a51cc4e6c` — centralize provider operations
  - `0fe085898d35038751783e7f868e139cf89ad27a` — central provider-operation tests
  - `9cd341108363cc5dd7becd173677fc804264ef11`, `d2c93e339effc5fbd0883da63452532ebb38fd7f`, `f735003fd8d81ede18a42a1eb2c3fafeabb0d555` — route WooCommerce draft/publish/reconcile through provider service.
- Implemented:
  - common operation vocabulary/capabilities/results;
  - shared adapter registry/service;
  - provider payload/response opacity;
  - explicit live-publish confirmation;
  - WooCommerce and Flipkart dispatch through the shared boundary.
- Remaining:
  - provider-neutral sync and broader lifecycle implementation;
  - runtime verification.

## 2026-10-06 — WooCommerce publish/reconciliation hardening

- Important commits:
  - `115c5b60f7ddced178e52e395984818f8df9bd22` — durable publish-attempt table
  - `a18e84a3a803cde4ec5350bfa133e175ab35ccb1` — attempt lifecycle persistence
  - `0c490f769b6b376570dce04ca87135c88e150aed` — replay/block unresolved attempts
  - `3e2dc77dae5808b4e582b9d6c2cbc1685c14f205` — ambiguous network outcomes
  - `73482b8307f853a5000b224ea360f1e4aba70b81` — service-level idempotency requirement
  - `677ec48d9da7e3bdc5554c9401d2c8576f4a8ef8` — reconciliation API error hardening
  - `4b20471e615b1e4117f29271fb32ec47d47ee820`, `b70448f84393da421a6225ef475e7e539ee3d8c5` — reconciliation identity and tests.
- Current behavior:
  - durable operation attempts;
  - idempotent replay;
  - ambiguous/unknown outcomes;
  - reconciliation before unresolved operations can converge;
  - listing identity checks;
  - stable API error mapping.
- Verification:
  - focused automated tests exist;
  - full runtime/provider verification remains pending.

## 2026-10-06 — AI Creator grounding and human review

- Commits:
  - `73a5cd58e3f43d696ce5d4e47b3f3caa1db0ce27` — ground Creator in product/offer context
  - `db4aca750b57cb37f5b587de105ebc88df05f156` — enforce AI copy review/product grounding
  - `f6d01fdec93bf5453b080cd2e6ded051f0ae9212`, `87cd09ea937eedea524cb908120606b356dca5ed` — require human review before saving AI copy/channel variants
  - `f646eb28e05ff2d1f57e6bc16bf8e0ef11657a5a` — fail closed on malformed output
  - `1d6f44feab886e6de55c65ce654554881b79c0cf` — explicit Creator validation errors
  - `9b38127050af8991207a292b35a00a1b379d6d80`, `40aac020af34a2f3992984bb42b79e109da1bc75`, `fd20f371cc5746e8325abb56acc57d6eb0797e21` — content-item grounding/identity
  - `49674fae9f02b57777d24e92cd5352457e0db218`, `3826e90643c73c679ff9cdab7438ca5b78fe8f52`, `83d9ded22698371ca5121f84c6e1a00f9ee5864c` — campaign strategy context.
- Implemented:
  - selected product/offer/content/campaign grounding;
  - review gate before persistence;
  - fail-closed malformed model output;
  - explicit validation errors;
  - campaign strategy context preservation.

## 2026-10-06 — Optimizer evidence and experiment learning

- Commits include:
  - `bfbc830a02825f1f602c624c4e6fe0a6a91f4dfa` — evidence-ranked opportunities
  - `b41ee495cf44ef5da1eecd1aca28c77d3f5bbd65` — evidence-ranked experiments
  - `946331dd4f5e93264c46b11034f2bf8b0169a162` — deterministic experiment ranking
  - `8bdef61fb8e6e83ffcf75b7f15fb5c98aa9c86ff` — classify experiments by historical evidence
  - `8b5a07ccd85d5467b3bef0ad179b6c15c8498e18` — deterministic dispositions
  - `79711495aad9dae8ea218f8fb0423656a08da0b4` — persist dispositions
  - `74baac63fff2fe9ca69b8f1a250650308d972937`, `e4881c0aca367b60e8870a6c46a9c60c0bc64dac0` — surface/carry disposition through weekly review/approval
  - `4265261dd577680dfe72f410a724eac061aee873`, `2a152e40c4eeb9525f0c1de3b609b4d0d6e627ca`, `54bcf76cce57a117f002297d6895512c7cb42e3e` — persist/surface experiment provenance
  - `0d42a6fa9ab422bad1f6794b710e08d0b2554fec`, `2b692caf1e1f7d7386ae6a00711f607894b196ff` — expose learning signals.
- Principle:
  - observed evidence is surfaced explicitly;
  - causal claims are not fabricated;
  - weekly planning carries rationale, provenance and disposition.

## 2026-10-06 — Social account reconnect/status hardening

- Commit:
  - `c86311028015b6d58d156095953f70494bb67f007` — merge account reconnect/status fixes.
- Related commits:
  - `dbfa9a78c47f71ece3c5436f49b5af621c7fb532`, `6579fe42505ee4712af9f39f019992601fe829bd` — Pinterest reconnect state/board behavior.
  - `46303b94571257c3b46a096818d73e9dd7fa1036`, `35ccf4ea9126f88918e035c8ab8c8159ce568bb1`, `a4c1af895b6c4f34b97b996c6a38ad4cbdd0d349` — Google Business reconnect behavior.
  - `ce1aeb3002eaf293d704e817ca4ed92ec6f2cd7a`, `5fb1e3907d0beccbb0d204f0d420be89d6a4de49` — scoped/reliable account status refresh.
  - `0b75a9eadf1da6c57a0a97eff29c913fe1403873`, `e757e3165d6bfef6ce81f90e2b19f2aa6a96277b`, `3e2202a5d890f4a657dbc11c93f7cdc8be0f2e73` — hide disconnected targets from post surfaces.
- Implemented:
  - reconnect no longer forces unrelated selections;
  - status refresh is user-scoped;
  - disconnected targets are excluded from publishable post views.

## 2026-10-05 — Automated Vitest execution in CI

- Commits:
  - `5bdbf1bac424722dfb2c98319d5f471f2e8fe727` — test scripts
  - `ee11425b2015bef8ab57def60f1394482fbcd113` — run Vitest in quality workflow.
- Implemented:
  - `npm test` → `vitest run`;
  - `npm run test:watch`;
  - CI test execution before lint/build.
- Verification:
  - workflow configuration is present;
  - the latest overall quality result must still be observed before claiming green CI.

## 2026-09-24 to 2026-09-23 — WooCommerce publish foundation

Historical implementation established:
- duplicate connection protection;
- guarded publish endpoint;
- durable `commerce_publish_attempts`;
- idempotency enforcement;
- ambiguous provider outcome classification;
- reconciliation endpoint and identity validation;
- stable error handling.

## 2026-09-10 and earlier — Amazon foundation

Historical implementation established:
- Amazon LWA OAuth;
- product-type discovery fallbacks;
- linked schema retrieval;
- schema-aware product editor;
- conditional requirement evaluation;
- seller-friendly identity;
- explicit typed identifier/ASIN handling;
- product-only validation preview;
- separation of offer/fulfillment fields;
- Amazon catalog matching foundation;
- offer-layer foundation.

Historical incidents that shaped the architecture:
- product details SQL alias issue;
- Shopify status typing;
- Shopify sync stuck before catch/finalization;
- mistaken AWS/IAM expectation for Amazon LWA;
- Amazon structured-response `[object Object]` rendering;
- exact product-type lookup failures;
- schema link retrieval;
- conditional requirements activating after data entry;
- Amazon 90248 from operational fulfillment data in product preview;
- Amazon 90188 from invalid external identifier.

## 2026-09-08 — Payment/refund audit

Historical validation passed a critical failed-refund → new-idempotency-key retry → successful provider refund scenario.

Production-hardening remains deferred:
- webhook edge cases;
- ambiguous provider failures;
- reconciliation;
- concurrency/idempotency;
- authorization/security;
- operational readiness;
- test-data cleanup.

Do not treat the audit as current production certification.

## Persistent verification rule

Every implementation entry must distinguish:
- repository/source inspection;
- automated test evidence;
- build/type/lint evidence;
- database/migration execution;
- real provider verification.

Never convert “implemented” to “verified” or “production-ready” without the corresponding evidence.


## 2026-10-06 — Commerce publish operation ledger hardening

- **Status:** Implemented; not runtime-verified.
- **Commits:** `ee24383a78bfda2c3e03f65d60eb84849b65bb42`, `c0e6b8ed4c760208adb6b537480e31549e8d8b34`
- **Files:** `lib/commerce/publish/operations.ts`, `lib/commerce/publish/operations.test.ts`
- **Implemented behavior:** Success transitions now fail closed without a non-empty external ID, trim the confirmed provider ID before persistence, and continue to allow success only from `prepared`, `in_progress`, or `unknown`. Focused tests cover the success invariant and lifecycle eligibility for start, failed, and unknown states.
- **Verification:** GitHub repository writes succeeded. Local test/lint/type-check/build and DB execution remain unverified; no provider mutation was executed.


## 2026-10-06 — Publish lifecycle success-transition hardening and tests

- Commits:
  - `ee24383a78bfda2c3e03f65d60eb84849b65bb42` — harden publish success transition.
  - `c0e6b8ed4c760208adb6b537480e31549e8d8b34` — add publish operation lifecycle tests.
- Implemented:
  - success now requires a non-empty confirmed external ID;
  - confirmed external ID is normalized and persisted explicitly;
  - success is restricted to prepared/in-progress/unknown operations;
  - focused tests cover success preconditions and legal state transitions.
- Verification limitation:
  - tests are present in the repository; no fresh overall CI pass is claimed here.
  
## 2026-10-06 — Flipkart client contract verification seam

- Commits:
  - `f3bda849a663a5dde97ec076051cf6daa0e3e2f2` — add Flipkart client contract tests.
  - `bb01a2701ebf5df54d67386e2f8a371216b2d74c` — document verification seam.
- Tests cover:
  - sandbox seller API URL and bearer auth;
  - SKU normalization/encoding and 1–10 lookup bounds;
  - empty/expired token fail-closed behavior;
  - non-2xx responses as failures;
  - production URL selection only when explicitly configured.
- These are deterministic transport-contract tests, not live provider verification.

### 2026-10-06 — Commerce code-level hardening checkpoint
- Flipkart API routes now validate session user identity before provider dispatch.
- Publish success persistence is bound to user + listing + provider and requires a confirmed external ID.
- Shared provider service enforces runtime draft/publish capabilities and explicit live-publish confirmation.
- WooCommerce channel configuration/credentials are tenant-scoped by user context.
- WooCommerce publish now records provider submission as ambiguous and requires provider read-back reconciliation before terminal success.
- Full tests/lint/build are intentionally deferred until the remaining code-level implementation pass is complete.

### 2026-10-06 — Commerce code-level hardening continuation
- Made publish-operation reservation atomic and race-safe; bound idempotency keys to operation type and validated key/input bounds.
- Preserved WooCommerce ambiguous state after a provider mutation if database persistence fails, preventing unsafe duplicate retries.
- Exposed WooCommerce publish ambiguity as HTTP 202 with explicit reconciliation-required state.
- Hardened WooCommerce route identity and reconciliation-status tenant/provider scoping.

### 2026-10-06 — Shopify tenant boundary hardening
- Tenant-scoped Shopify GraphQL client and credential access.
- Tenant-safe Shopify connect/callback and Commerce channel listing route identity validation.

### Commerce tenant-integrity and canonical fingerprint hardening — 2026-10-06
- Added tenant-integrity constraints for Commerce channel/listing/publish-ledger relationships.
- Canonicalized publish request fingerprints for deterministic idempotency behavior.

### WooCommerce lifecycle state-machine hardening — 2026-10-06
- Corrected the WooCommerce post-provider listing persistence parameter binding so a successful remote mutation cannot be recorded against the wrong database row.
- Reconciliation now rejects conflicting existing external IDs and provider-mismatched durable attempts, and the final listing update only succeeds when the existing external ID is null or matches the provider-confirmed ID.

### Provider adapter outcome normalization — 2026-10-06
- WooCommerce adapter now checks reconciliation-required outcomes before generic error normalization, preserving ambiguous publish state and preventing accidental retry classification.
- Flipkart publish adapter outcomes are normalized so disabled/not-found/failed states cannot be mistaken for reconciliation success.

### 2026-10-06 — Flipkart reconciliation state consistency
- Validated the Flipkart publish operation against authenticated tenant, listing, provider, and reconciliable status before provider read-back.
- Changed shared publish-success persistence to transactionally lock/update the operation and listing together, requiring matching or empty existing external identity.
- Normalized deterministic Flipkart reconciliation errors as failed and provider/read-back uncertainty as ambiguous/retryable.
- Fixed the WooCommerce reconciliation POST route's authenticated user ID handling; the previous self-reference was invalid and the POST path now validates the same safe positive tenant identity as the GET path.
### 2026-10-06 — Commerce provider-entry audit
- Fixed the WooCommerce publish route to derive the authenticated user ID from the session before provider dispatch.
- Hardened Shopify credential read/write helpers with tenant/provider ownership checks.
- Updated Shopify callback and refresh paths to pass user context into credential persistence.
- Removed an invalid unscoped Shopify `getShop` call signature by requiring explicit tenant context.


## 2026-10-06 — Commerce credential boundary and provider-client hardening

- **Status:** Implemented; not runtime-verified.
- **Flipkart:** credential writes now require userId and verify tenant/provider ownership; OAuth callback and locked refresh rotation pass authenticated tenant identity. Publish responses now distinguish ambiguous reconciliation-required submission with HTTP 202 from normal creation (201) and idempotent replay (200).
- **Amazon:** credential persistence and lookup now require authenticated tenant context; the SP-API client no longer uses an unscoped internal channel lookup and requires userId for provider calls. Product-type discovery and connection verification pass the tenant context through.
- **Verification limitation:** no tests/lint/build or provider mutation was executed during this implementation pass, per the current development sequence. Repository code remains pending the later verification pass.


## 2026-10-06 — Shopify live-publish confirmation hardening

- **Status:** Implemented; not runtime-verified.
- The legacy Shopify publish route now requires confirmLivePublish=true and returns a conflict when omitted.
- The underlying Shopify publisher also requires explicit confirmation, so the safety boundary cannot be bypassed by another direct caller.
- Shopify remains outside the shared durable publish ledger; this change intentionally closes the confirmation bypass without introducing a broad legacy-path refactor during the current pass.


## 2026-10-06 — Shopify publish concurrency hardening

- **Status:** Implemented; not runtime-verified.
- Added a PostgreSQL advisory lock around the legacy Shopify create lifecycle, keyed by authenticated tenant + channel + product.
- The lock covers listing resolution, remote product creation, variant/media persistence, and final listing state, preventing concurrent duplicate productCreate calls for the same logical listing.
- This is concurrency protection, not provider-native idempotency; crash-after-remote-create recovery remains a separate durability concern.


## 2026-10-06 — Shopify deterministic crash recovery

- **Status:** Implemented; not runtime-verified.
- Added `dizito.listing_id` as a Shopify product metafield at product creation time.
- Added exact provider-side lookup by that marker before a new create. A unique match is adopted and reconciled through the existing sync flow; ambiguous matches fail closed.
- Hardened variant reconciliation for partial creates: when exactly one provider variant exists and no listing-variant mappings exist, that provider variant is deterministically associated with the canonical first variant.
- This closes the principal crash-after-remote-create recovery path for newly created Shopify products without relying on title/SKU heuristics.


## 2026-10-06 — Amazon SP-API tenant-boundary completion

- **Status:** Implemented; not runtime-verified.
- Propagated authenticated `userId` through Amazon catalog, listing, offer, product-type, and verification helpers and routes.
- Fixed the Amazon OAuth callback credential write to pass `userId` into the tenant-scoped credential persistence function.
- Completed the final catalog helper call so every `amazonSpApiRequest` invocation supplies tenant context.


## 2026-10-06 — Commerce channel identity race hardening

- Added migration `017_commerce_channel_identity_uniqueness.sql` with a tenant/provider/external-account unique index.
- Updated `createCommerceChannel` to catch PostgreSQL unique-constraint races and return the authoritative existing channel for concrete external account identities.
- This protects OAuth reconnect flows from duplicate channel creation under concurrent callbacks.


## 2026-10-06 — WooCommerce ambiguity propagation hardening

- Updated WooCommerce publish to return an explicit reconciliation-required result when provider mutation succeeded or network state is uncertain.
- Updated WooCommerce adapter to preserve that result as `ambiguous` rather than `failed`.
- Updated WooCommerce reconciliation to mark provider-state uncertainty as ambiguous and the reconcile route to return HTTP 202.
- Deterministic reconciliation errors remain normal failed outcomes.


## 2026-10-06 — Commerce channel access/update hardening

- Removed unused unscoped Commerce channel lookup helper.
- Serialized channel updates with a tenant-scoped `FOR UPDATE` transaction so metadata merges are based on the latest committed row.
- Reconfirmed Shopify/Amazon credential persistence has channel FK + unique channel identity at the database layer and tenant/provider checks in application code.


## 2026-10-06 — Commerce listing concurrency and route-boundary hardening

- **Status:** Implemented; not runtime-verified.
- Product listing sync-state updates now lock the tenant-owned listing row and merge provider metadata with the latest committed state, avoiding concurrent metadata loss.
- Listing sync persistence now detects an existing conflicting external ID before adopting a provider identity.
- Product listing variant upserts now preserve an existing external ID when the field is omitted, merge provider metadata, and reject duplicate external IDs within the listing.
- Draft listing saves now lock the existing listing, merge metadata, and apply the same variant external-ID conflict protection.
- Fixed self-referential session user-ID defects in Commerce listing/channel routes and standardized safe positive user-ID validation across Amazon, WooCommerce, Shopify, Flipkart, and channel API boundaries.
- Shared Commerce publish reconciliation now serializes external-ID adoption by tenant/channel/external-ID before committing the listing identity, preventing concurrent claims of the same remote object.
- Tests/lint/build and live provider verification remain deferred until the complete implementation pass is finished.

- Listing-variant reads now explicitly join the tenant-owned canonical product before returning mappings, closing a legacy-row tenant-boundary gap.


## 2026-10-06 — Commerce sync claim-token hardening

- **Status:** Implemented; not runtime-verified.
- Added a durable sync claim token to product_listings to close the stale-worker race left by the existing 10-minute lease timeout.
- claimProductListingSync now issues a unique token; updateProductListingSyncState requires the token and clears it atomically when committing the result.
- Shopify sync propagates the claim token for both success and error persistence, so a reclaimed listing cannot be overwritten by an older worker.
- Added migration 019_product_listing_sync_claims.sql.
- Tests/lint/build and live provider verification remain deferred until the complete implementation pass is finished.


## 2026-10-06 — Legacy Commerce listing/media hardening

- **Status:** Implemented; not runtime-verified.
- Standardized safe positive session user-ID validation across the legacy product-listing APIs.
- Hardened listing media persistence to preserve omitted external IDs, merge provider metadata, and reject duplicate provider media identities within a listing.
- Hardened the legacy variant API so omitted external IDs do not clear existing mappings and deterministic mapping conflicts return HTTP 409.
- Tests/lint/build and live provider verification remain deferred until the complete implementation pass is finished.


## 2026-10-06 — Commerce route-entry audit

- Reviewed remaining Commerce route entry points for direct provider bypasses and tenant-boundary regressions.
- Flipkart and WooCommerce publish/reconcile routes remain on the shared provider dispatcher.
- Flipkart OAuth state and callback credential persistence remain tenant-bound.
- WooCommerce connection verification and credential persistence remain tenant-bound.
- Shopify's legacy publish/sync implementation remains intentionally separate because it has its own durable crash-recovery mechanism.
- Removed redundant duplicate user-ID validation in Shopify publish/sync routes.
- No tests/lint/build executed yet; implementation pass remains in progress.


## 2026-10-06 — Commerce credential provider-boundary hardening

- Identified and fixed a WooCommerce credential boundary gap: tenant ownership was checked, but provider identity was not.
- WooCommerce credential save/read now require `commerce_channels.provider = 'woocommerce'` in addition to user ownership.
- Re-audited the four Commerce credential implementations and confirmed provider/tenant scoping is present for Shopify, Amazon, Flipkart, and WooCommerce.
- Validation remains deferred until the complete code implementation pass is finished.


## 2026-10-06 — Sync claim-token regression fix

- Found during code-only audit that `claimProductListingSync()` wrote `sync_claim_token` but omitted it from `RETURNING`.
- Fixed the query to return the token and preserve the worker lease handoff contract.
- No runtime tests executed yet, per implementation-first sequencing.


## 2026-10-06 — Commerce draft creation race hardening

- Added deterministic handling for concurrent `product_listings` creation in the draft upsert path.
- A unique-constraint race now resolves to the existing tenant-owned listing and continues the draft mapping transaction.
- This complements the existing listing row lock for already-created listings.
- Tests/lint/build remain deferred until the implementation pass is complete.


## 2026-10-06 — Commerce draft race transaction correction

- Added savepoint-based recovery around concurrent `product_listings` creation.
- This is required because PostgreSQL marks the transaction failed after a constraint violation; the recovery SELECT now runs after `ROLLBACK TO SAVEPOINT`.
- Non-unique errors remain fatal and preserve the original failure.
- Tests/lint/build remain deferred until the implementation pass is complete.


## 2026-10-06 — Commerce listing-media concurrency hardening

- Converted listing-media upsert to an explicit transaction.
- Locks the tenant-owned listing before checking/updating media mappings.
- Locks the current mapping and performs external-ID conflict detection within the transaction.
- Preserves existing external IDs and provider metadata merge behavior.
- Tests/lint/build remain deferred.


## 2026-10-06 — Commerce sync external-ID race hardening

- Added the same PostgreSQL transaction advisory-lock pattern used by publish reconciliation to listing sync-state external-ID assignment.
- Conflict detection and assignment are now serialized per tenant/channel/external ID.
- Tests/lint/build remain deferred.


## 2026-10-07 — Commerce mapping external-ID normalization

- Added normalization of blank/whitespace-only external IDs in listing variant and draft mapping paths.
- Existing omitted IDs continue to be preserved, while explicitly blank IDs no longer become meaningful provider identifiers.
- Media mapping still requires the same normalization patch; validation remains deferred.


## 2026-10-07 — Commerce reconciliation and identity race hardening

- **Status:** Implemented; not runtime-verified.
- Corrected the remaining external-ID normalization gaps in listing draft and sync-state persistence. Explicit blank/whitespace-only IDs now normalize to NULL; omitted IDs remain preserved.
- Completed media mapping normalization as well. The earlier status note saying media normalization was pending is superseded by this entry.
- Hardened WooCommerce reconciliation: the listing is locked, its existing external ID is checked, an advisory lock serializes the tenant/channel/external-ID identity, and another listing cannot claim the same provider product ID.
- Hardened WooCommerce idempotent replay with the same external-ID advisory lock and cross-listing conflict check before committing the replayed provider identity.
- updateCommerceChannel now returns deterministic CHANNEL_IDENTITY_CONFLICT on the provider/account uniqueness constraint rather than leaking a raw PostgreSQL 23505.
- Legacy product-listing variant API session validation now requires a positive safe integer.
- No tests/lint/build/live provider verification executed; implementation-first sequencing remains in effect.
\n\n## 2026-10-07 — Marketing variant-to-post provenance hardening\n\n- **Status:** Implemented; not runtime-verified.\n- Added migration `020_marketing_content_item_variant_posts_v1.sql`.\n- Extended `marketing_content_item_posts` with nullable `variant_id` and a composite foreign key tying the selected variant to the same Content Item.\n- Content Item → Post creation now persists the exact selected channel variant when a variant is used. Legacy Content Item → Post rows remain valid with a NULL variant.\n- Manual attribution now requires a durable Variant → Post link when both `variantId` and `postId` are supplied, preventing attribution from claiming a variant that did not produce the Post.\n- Tests/lint/build/database execution/provider verification remain deferred under the implementation-first sequence.\n

## 2026-10-07 — Commerce provider-adapter outcome hardening

- **Status:** Implemented; not runtime-verified.
- Removed the unreachable duplicate WooCommerce publish ambiguity branch from the provider adapter.
- Added deterministic Flipkart LISTING_EXTERNAL_ID_CONFLICT handling to the adapter's failed-reconciliation classification.
- Re-audited application-level direct writes to product_listings, product_listing_variants, and product_listing_media; no additional write paths were found outside the hardened listing services.
- No tests/lint/build/live provider verification executed; implementation-first sequencing remains in effect.
\n\n## 2026-10-07 — Marketing attribution detail propagation\n\n- **Status:** Implemented; not runtime-verified.\n- Business Impact now exposes explicit attributed Content Item, Variant, and Post summaries in addition to the existing campaign-level attribution summary.\n- The Marketing Optimizer now receives and returns attributed variant/content evidence with opportunities and incorporates that evidence into deterministic opportunity ranking.\n- Observed customer-action outcomes and manual attribution remain separate evidence types; attribution is never treated as causal proof.\n- Tests/lint/build/database execution/provider verification remain deferred under the implementation-first sequence.\n

### Marketing provenance consumer hardening — 2026-10-07
- The legacy Content Item → Post linking endpoint now accepts an optional variant ID and validates that the variant belongs to the Content Item and that the Post targets the variant's platform before persisting the provenance.
- Content Item reads now expose postLinks containing { postId, variantId } while retaining the existing postIds compatibility field.
- Optimizer opportunities now return the already-computed explicit attributed outcome; the Optimizer UI surfaces it separately from observed outcome evidence.
- Legacy Content Item → Post links remain compatible with nullable variant provenance for historical records.
- Implementation is source-level only; tests/lint/build/database verification remain pending.


- The legacy link upsert now backfills a missing variant ID on an existing Content Item → Post row without overwriting established provenance.


## 2026-10-07 — WooCommerce channel-client boundary hardening

- **Status:** Implemented; not runtime-verified.
- Added the missing tenant-scoped `getWooCommerceChannelConfig` implementation used by WooCommerce publish/reconcile.
- The boundary validates authenticated tenant ownership, provider identity, active channel status, configured store URL, and tenant-scoped encrypted credentials before remote access.
- No tests/lint/build/live provider verification executed; implementation-first sequencing remains in effect.


## 2026-10-07 — Meta business-scoped Page discovery hardening

- **Status:** Implemented; runtime provider verification pending.
- Confirmed the active Dizito Meta OAuth path is `/api/meta/connect` using Facebook Login for Business `config_id`; the legacy scope-based `/api/meta/login` route was not the production connection path and has been removed.
- Added shared Meta Graph helpers with a configurable `META_GRAPH_VERSION` defaulting to `v26.0`.
- Kept `/me/accounts` as the primary Page discovery endpoint and added a business-scoped `/me/assigned_pages` fallback when `/me/accounts` returns an empty list.
- Reused the existing page-selection and social-account persistence model; assigned Pages are normalized into the same `pageId/pageName/access_token/instagramBusinessId` flow.
- Instagram Business Account discovery now uses the shared Meta helper and the discovered Page Access Token when available.
- Updated the Meta connection, callback, Page connection, Facebook publisher, and Instagram publisher paths to the current Graph API version.
- Removed obsolete public Meta token/debug endpoints that contained hard-coded access tokens, and removed the unused legacy scope-based Meta login route.
- Added regression tests covering direct Page discovery, Business Portfolio assigned-Page fallback, and the true no-Pages case.
- Important verification note: the developer/admin account working previously is consistent with Meta role-based access and does not prove external customer authorization. External customer verification remains a required runtime check.
- Meta configuration follow-up: if the external Business Portfolio Page still does not appear, the Facebook Login for Business configuration must include the required `business_management` access and Meta must approve it where required. The repository cannot grant this permission itself.
- No live Meta customer-account test, full build, lint, or complete Vitest run has been executed yet on this branch.


### V1 launch planning + parallel execution model — 2026-10-07
- Reframed immediate development around V1 Beta completion rather than additional feature accumulation.
- Added launch definition covering Business Brain → Strategy → Weekly Plan → Review → Approval → Platform Distribution → Customer Actions → Business Impact → Optimizer.
- Recorded Meta `business_management` App Review as in progress, Pinterest Standard Access as granted with live runtime verification still pending, and Google Business Profile API application as an external dependency.
- Recorded the need for a Dizito-specific design system, subscription/pricing redesign, video capability architecture, security audit, scalability/observability work and explicit external provider verification.
- Current Neon inspection found approximately 12 MB database size, 46 public tables and 156 public indexes; no storage-driven migration is currently justified.
- Added parallel workstream guidance so UI, billing, media/video, security, QA/CI, external provider verification, commerce hardening and infrastructure can proceed with explicit file ownership and continuation handoffs.


## 2026-10-08 — Media/video post-boundary hardening

- **Status:** Implemented; not runtime-verified.
- Post creation now validates `mediaId` as a positive integer, verifies tenant ownership and excludes soft-deleted media before persisting the post link.
- Posts cannot be created against media whose processing state is not `ready`.
- `types/media.ts` now exposes the new media-library video lifecycle metadata used by the UI/publisher boundary.
- No fresh GitHub Actions run is available for the workstream commit; tests/lint/type-check/build remain pending.
- The additive media migration is still not applied to the default Neon branch.


## 2026-10-08 — Direct-upload verification hardening

- **Status:** Implemented; not runtime-verified.
- Direct Cloudinary upload completion now re-reads the uploaded resource server-side and validates resource type, supported Cloudinary format, MIME policy and actual byte size before creating the media-library record.
- This closes the gap where a client could obtain a valid signed folder upload but bypass the application-reported size/type policy during completion.

## 2026-10-08 — Post edit media lifecycle hardening

- **Status:** Implemented; not runtime-verified.
- Hardened `app/api/posts/[id]/route.ts` so media selection during edits follows the same tenant, soft-delete and processing-state invariants as post creation.
- Explicit null/empty media selection clears media; omitted `mediaId` preserves the existing association.
- Post detail media joins are tenant-scoped and exclude soft-deleted media while exposing video lifecycle metadata.
- Tests/lint/type-check/build and database/runtime verification remain pending.

## 2026-10-08 — Pinterest large-video upload hardening

- **Status:** Implemented; not runtime-verified.
- Replaced the Pinterest video publisher's full `arrayBuffer()` materialization with a streamed multipart request body.
- Preserved Pinterest's documented sequence: register video upload, upload multipart media, poll media status, then create the Pin using `video_id` plus `cover_image_url`. citeturn0search0
- Scheduler media projection now carries filename and video lifecycle metadata required by the publisher.
- Created draft PR #50 for CI/review; no merge performed.
- GitHub currently reports no workflow run/status for the latest head commit, so tests/lint/build remain unclaimed.
