# Marketing Content Items v1

## Purpose

Content Items are the persistent planning layer between a Campaign and Dizito's existing execution-level Posts.

They allow Marketing 2.0 to plan what should be created before turning that plan into a publishable social post.

## Model

`Campaign → Content Item → Channel Variant → Post → Post Target → Scheduler → Publisher`

A Content Item is not a replacement for `posts`. A Post remains the execution artifact used by the existing publishing system.

## Content Item responsibilities

A Content Item can capture:

- content type and format
- topic and angle
- hook
- generic body/copy
- CTA
- intended channel strategy
- planned publication time
- an existing media asset
- canonical Commerce Products associated with the content
- lineage to one or more execution-level Posts

## Channel variants

A Content Item may have one normalized variant per supported platform:

- Facebook
- Instagram
- LinkedIn
- Pinterest
- Google Business

Variants hold platform-specific hook, body, CTA and optional media. They are persisted in `marketing_content_item_variants` and remain linked to the parent Content Item.

The generic Content Item remains the strategic/content concept. A variant is the channel-specific execution brief. A selected variant can be converted into a normal Post only for social accounts on the same platform.

This prevents the scheduler from becoming channel-aware: the existing `posts`, `post_targets`, scheduler and publisher layers remain unchanged.

## AI Creator

AI Creator v1 provides controlled copy generation for a Content Item brief and can adapt that brief to a selected platform.

`Business Brain + Campaign + Content Brief + Platform → AI Creator → Editable Variant Body`

The creator is recommendation-only. It does not publish, schedule, or mutate Commerce data. Generated copy remains editable by the user before it is saved or converted.

Endpoint:

- `POST /api/marketing/generate-content`

The optional `platform` input produces channel-aware copy. The creator uses the existing Business Brain context and is explicitly instructed not to invent product claims, prices, discounts, customer facts, URLs, guarantees, features, or offers.

## Persistence

`marketing_content_items` belongs to the Marketing domain and is user-scoped.

`marketing_content_item_products` references canonical Commerce `products` and does not duplicate product data.

`marketing_content_item_variants` stores one variant per platform for a Content Item.

`marketing_content_item_posts` provides structural lineage from a planned content item to execution-level Posts.

Media references canonical `media_library` through `media_id`.

## Lifecycle

Content Item:

- `draft` — being prepared
- `planned` — part of a marketing plan
- `ready` — sufficiently prepared for conversion into execution
- `converted` — linked to an execution-level Post
- `archived` — no longer active

Variant:

- `draft` — being prepared
- `ready` — available for Post conversion
- `converted` — used to create a Post
- `archived` — no longer active

## API

- `GET /api/marketing/content-items`
- `GET /api/marketing/content-items?campaignId=:id`
- `POST /api/marketing/content-items`
- `GET /api/marketing/content-items/:id`
- `PATCH /api/marketing/content-items/:id`
- `GET /api/marketing/content-items/:id/variants`
- `POST /api/marketing/content-items/:id/variants`
- `POST /api/marketing/content-items/:id/posts`
- `POST /api/marketing/content-items/:id/create-post`
- `POST /api/marketing/generate-content`

All endpoints require authentication and enforce user ownership.

## Boundary

Channel variants do not implement:

- campaign analytics
- customer actions
- attribution or revenue measurement
- automatic publishing
- AI optimization

Those capabilities consume this planning and execution lineage through separate measurement and attribution layers.
