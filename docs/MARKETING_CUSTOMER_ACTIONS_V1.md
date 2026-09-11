# Marketing Customer Actions v1

## Purpose

Customer Actions add the first measurement layer between Marketing execution and business outcomes.

The model is:

`Campaign → Content Item → Channel Variant → Post → Customer Action → Customer / Order`

This is intentionally an event/measurement layer. It does not replace the canonical Commerce customer or order domains.

## Supported actions

- `lead`
- `booking`
- `message`
- `call`
- `website_visit`
- `checkout`
- `order`
- `purchase`

Actions can optionally reference:

- campaign
- content item
- channel variant
- canonical Commerce customer
- Commerce order identifier
- monetary value and currency
- source/external identifier
- arbitrary metadata
- occurred-at timestamp

## Persistence

`marketing_customer_actions` is user-scoped.

`customer_id` references canonical Commerce `customers`; no second marketing customer entity is introduced.

`order_id` is retained as a Commerce order identifier so this measurement layer can connect to order/revenue records without duplicating Commerce orders. Order validation/integration can be tightened when the corresponding Commerce ingestion workflow is connected.

External source identifiers are idempotent per user when both `source` and `external_id` are supplied.

## API

- `GET /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions?campaignId=:id`
- `POST /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions/summary`

The POST endpoint validates all supplied Marketing and customer references against the authenticated user. It supports idempotent upsert for externally sourced actions.

## Measurement boundary

v1 provides durable action capture and aggregate counts/value. It does not yet infer attribution, calculate campaign ROI, or mutate Commerce orders.

Future measurement can use the persisted lineage to answer:

`Which campaign/content/channel produced the customer action?`

and eventually:

`Which marketing activity produced the order and revenue?`

## AI boundary

Customer Actions are measurement input only. AI Strategist and AI Optimizer should consume this data later; they should not be built on inferred or synthetic performance data.
