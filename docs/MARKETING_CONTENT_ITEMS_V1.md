# Marketing Content Items v1

## Purpose

Content Items are the persistent planning layer between a Campaign and Dizito's existing execution-level Posts.

They allow Marketing 2.0 to plan what should be created before turning that plan into a publishable social post.

## Model

`Campaign → Content Item → Post → Post Target → Scheduler → Publisher`

A Content Item is not a replacement for `posts`. A Post remains the execution artifact used by the existing publishing system.

## Content Item responsibilities

A Content Item can capture:

- content type and format
- topic and angle
- hook
- body/copy
- CTA
- intended channel strategy
- planned publication time
- an existing media asset
- canonical Commerce Products associated with the content
- lineage to one or more execution-level Posts

## Persistence

`marketing_content_items` belongs to the Marketing domain and is user-scoped.

`marketing_content_item_products` references canonical Commerce `products` and does not duplicate product data.

`marketing_content_item_posts` provides structural lineage from a planned content item to execution-level Posts.

Media references canonical `media_library` through `media_id`.

## Lifecycle

- `draft` — being prepared
- `planned` — part of a marketing plan
- `ready` — sufficiently prepared for conversion into execution
- `converted` — linked to an execution-level Post
- `archived` — no longer active

## API

- `GET /api/marketing/content-items`
- `GET /api/marketing/content-items?campaignId=:id`
- `POST /api/marketing/content-items`
- `GET /api/marketing/content-items/:id`
- `PATCH /api/marketing/content-items/:id`
- `POST /api/marketing/content-items/:id/posts`

All endpoints require authentication and enforce user ownership.

## Boundary

Content Items do not yet implement:

- AI content generation
- Generate My Week
- campaign analytics
- customer actions
- attribution or revenue measurement
- automatic publishing

Those capabilities will consume this planning layer later.
