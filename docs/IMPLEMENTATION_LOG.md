# Dizito Implementation Log

## 2026-09-22 — WooCommerce publish state persistence

- **Status:** Implemented; not yet verified in a running environment.
- **Commits:**
  - `ea131688d1b101589b9aabb592a35a8dd3e41175` — persist listing publish state.
  - `92774a84556bb395a168cfd457a7381784a49a8f` — require listing identity in publish API.
- **Files:**
  - `lib/platforms/woocommerce/publish.ts`
  - `app/api/commerce/woocommerce/publish/route.ts`
- **Implemented behavior:**
  - Publish now requires a tenant-owned `listingId` tied to the requested channel.
  - Already-published listings with an `external_id` are rejected with `LISTING_ALREADY_PUBLISHED`.
  - Listing state moves to `syncing` before provider creation.
  - Successful provider responses must include a product ID; the listing is then persisted as `active` / `synced` with `external_id` and `last_synced_at`.
  - Provider or response-validation failures persist `sync_status = 'error'` and `last_error`, then mark the channel as errored using the existing channel error path.
  - The API maps missing listings to 404 and duplicate publish attempts to 409.
- **Verification:**
  - Repository writes succeeded through GitHub.
  - Build, lint, type-check, automated tests, and a live/controlled WooCommerce request were not run in this step.
- **Remaining risk:**
  - This is not yet full idempotency: a provider may create a product while the response or local persistence fails, leaving a possible duplicate on retry.
  - Variant-level external IDs and publish state are not yet persisted by this path.
  - Create-vs-update semantics and provider reconciliation remain pending.
- **Next action:**
  - Add an explicit idempotency key / durable publish-attempt record before enabling broader live use, then add mocked tests for success, provider failure, ambiguous timeout, and retry.
