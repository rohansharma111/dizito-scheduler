# Marketing Foundation v1

## Purpose

Marketing Foundation v1 introduces the first persistent strategy/business-context layer above Dizito's existing social publishing engine.

## Domains

### Business Profile
`marketing_business_profiles` stores business context that is useful to marketing and AI without mixing it into the authentication/account `users` table.

Fields cover business name, type, industry, description, website, location, timezone, and brand voice.

### Marketing Goals
`marketing_goals` stores durable marketing objectives. Goals are user-scoped and can be prioritized, paused, completed, or archived.

### Marketing Offers
`marketing_offers` stores reusable marketing offers/promotions. This is intentionally distinct from Commerce order discounts: an offer is a marketing object that can later be attached to campaigns and content.

## Boundaries

- `users` remains the account/authentication/subscription identity.
- Commerce Products remain the canonical product catalog.
- `media_library` remains the canonical media store.
- `posts`, `post_targets`, the scheduler, and publishers remain the distribution/execution engine.
- No campaign, content-plan, attribution, or AI-strategy tables are introduced in this migration.

## Target evolution

Business Profile + Goals + Offers will feed a Business Brain context service. Later layers can add:

`Campaign -> Content Item -> Post -> Post Target -> Scheduler`

and eventually connect customer actions to Commerce Customers and Orders.
