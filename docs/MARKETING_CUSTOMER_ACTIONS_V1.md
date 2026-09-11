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

## Explicit Attribution v1

`marketing_attributions` is the first explicit attribution layer. Each attribution record belongs to one Customer Action and must reference at least one marketing touch: campaign, content item, channel variant, or Post.

v1 supports only the `manual` attribution model. That is deliberate: Dizito records attribution that an application or user explicitly supplies rather than inferring causality from timing or correlation.

An attribution may also reference a canonical Commerce order and an explicitly supplied `attributed_value`, currency, weight, and note. The API validates ownership and consistency of the referenced marketing entities, Customer Action, and Commerce order.

No automatic first-touch, last-touch, multi-touch, or ROI inference is introduced in v1.

## APIs

Customer Actions:

- `GET /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions?campaignId=:id`
- `POST /api/marketing/customer-actions`
- `GET /api/marketing/customer-actions/summary`

Attribution:

- `GET /api/marketing/attributions`
- `GET /api/marketing/attributions?campaignId=:id`
- `POST /api/marketing/attributions`

Business Impact:

- `GET /api/marketing/business-impact`

## Business Impact

The Business Impact read model now separates two concepts:

1. **Observed outcomes** — completed Customer Actions and campaign-linked actions supplied by measurement events.
2. **Explicit attribution** — outcomes for which a `marketing_attributions` record explicitly assigns a marketing touch.

Revenue reporting distinguishes observed linked order/value from explicitly attributed order/value. Attributed value is never populated by assuming that an order total belongs to a campaign; it must be supplied explicitly by the attribution record.

This is deliberately a measurement report, not a causal inference engine.

## Measurement boundary

v1 provides durable action capture, transparent campaign-linked observations, explicit manual attribution, and aggregate business-impact reporting. It does not infer multi-touch attribution, calculate ROI from inferred causality, or mutate Commerce orders.

Future attribution models can be introduced only when their business semantics, data requirements, and validation rules are established.

## AI boundary

Customer Actions, explicit Attribution, and Business Impact are measurement inputs only. AI Strategist and AI Optimizer should consume validated outcome data later; they should not be built on inferred or synthetic performance data.
