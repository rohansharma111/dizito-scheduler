# Flipkart Commerce Integration

## Status

- Phase: OAuth onboarding + verified listing mutation contract + idempotent publish preparation + read-before-retry reconciliation + validated drafts + read-only client + token-refresh foundation
- Status: Implemented; runtime verification pending
- Branch: `feature/commerce-flipkart`
- Live publishing: Not enabled

## Reconciliation foundation

`lib/platforms/flipkart/reconcile.ts` adds a safe read-before-retry flow for ambiguous publish operations.

It:

1. Loads the tenant-scoped Flipkart channel and current credentials.
2. Reads the relevant Flipkart listing(s) through the verified listing GET API.
3. Returns the provider response for explicit reconciliation.
4. Does not infer mutation success merely from an HTTP 200.
5. Requires an explicit external listing ID before the operation can be marked `succeeded`.

This is intentionally conservative because the provider response may contain account/listing-specific fields that cannot safely be interpreted without a verified response fixture or live sandbox verification.

## Current publish lifecycle

`prepared` → `in_progress` → `succeeded` / `failed` / `unknown`

For an ambiguous timeout:

`in_progress` → `unknown` → **read Flipkart listing** → explicit confirmation → `succeeded`

A retry should not be issued merely because the original request timed out.

## Remaining before live publishing

- Verify real create/update response fixtures or sandbox responses.
- Define exact provider-response-to-external-ID extraction.
- Implement actual mutation calls behind the operation ledger.
- Update product listing/variant external IDs only after confirmed success.
- Add automated unit/integration coverage once the repository can be built in a network-capable environment.
