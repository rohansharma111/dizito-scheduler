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

Actions can optionally reference campaign, content item, channel variant, canonical Commerce customer, Commerce order identifier, monetary value/currency, source/external identifier, arbitrary metadata, and occurred-at timestamp.

## Persistence

`marketing_customer_actions` is user-scoped. `customer_id` references canonical Commerce `customers`; no second marketing customer entity is introduced. `order_id` is retained as a Commerce order identifier so measurement can connect to order/revenue records without duplicating Commerce orders. External source identifiers are idempotent per user when both `source` and `external_id` are supplied.

## API

- `GET /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions?campaignId=:id`
- `POST /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions/summary`
- `GET /api/marketing/business-impact`

## Business Impact

The Business Impact read model aggregates completed Customer Actions and groups campaign-linked actions by campaign and action type. It also reports the count of distinct linked order identifiers and tracked value for completed `order`/`purchase` actions.

This is deliberately a measurement report, not an attribution engine. A value is only reported as marketing-linked when an external or application event has explicitly supplied the relevant marketing lineage. Dizito does not infer that an order was caused by a campaign merely because the order happened later.

## Measurement boundary

v1 provides durable action capture, aggregate counts/value, and transparent campaign-linked reporting. It does not yet infer multi-touch attribution, calculate ROI from inferred causality, or mutate Commerce orders.

Future attribution can use explicit lineage and validated Commerce order/revenue data to answer:

`Which campaign/content/channel produced the customer action?`

and eventually:

`Which marketing activity produced the order and revenue?`

## AI boundary

Customer Actions and Business Impact are measurement inputs only. AI Strategist and AI Optimizer should consume validated outcome data later; they should not be built on inferred or synthetic performance data.
