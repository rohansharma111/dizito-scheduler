# Business Brain v1

## Purpose

Business Brain v1 is a read-only aggregation layer for Marketing 2.0. It gives later planning and AI features a stable view of the business without becoming a second source of truth.

## Inputs

- Marketing Business Profile
- Marketing Goals
- Marketing Offers
- Canonical Commerce Products
- Canonical Commerce inventory balances through Product Variants
- Canonical Media Library
- Connected social accounts
- Recent marketing posts

## Boundary

Business Brain does not create campaigns, decide strategy, generate content, schedule posts, publish to social platforms, or mutate Commerce data.

It references existing domains and normalizes their data for future Marketing workflows.

## API

`GET /api/marketing/business-brain`

The endpoint is authenticated and read-only. It returns the current Business Brain for the signed-in user.

## Commerce boundary

Products remain owned by Commerce. Inventory is read from `inventory_balances` through `product_variants`; Marketing does not create a parallel product or inventory model.

## Next layer

Business Brain is the context input for Campaign planning and eventually Generate My Week. Campaigns should consume this context while preserving the existing Post → Post Target → Scheduler → Publisher execution path.
