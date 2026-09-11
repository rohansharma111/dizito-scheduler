# Marketing Campaigns v1

## Purpose

Campaigns are the persistent strategy layer above Dizito's existing post execution system.

A campaign represents the business reason and marketing plan behind a set of content and distribution actions.

## Model

`Campaign → Content Item → Post → Post Target → Scheduler → Publisher`

The Campaign layer does not replace or modify the existing publishing engine.

## Campaign inputs

- Marketing Goal (optional reference)
- Marketing Offer (optional reference)
- Canonical Commerce Products (many-to-many)
- Objective
- Audience
- CTA
- Channel strategy
- Start/end window

Products remain owned by Commerce. Campaigns reference products; they do not create a marketing product catalog.

## Lifecycle

- draft
- planned
- active
- paused
- completed
- archived

## Content planning

`marketing_content_items` is the planning bridge between campaign strategy and execution.

A Content Item can define the topic, angle, hook, copy, CTA, intended channels, planned time, reusable media, and canonical Commerce Products before an execution-level Post exists.

The intended lineage is:

`Campaign → Content Item → Post`

A Content Item may be linked to an existing Post through `marketing_content_item_posts`. Linking does not bypass or alter the existing `post_targets`, scheduler, or publisher execution system.

## Post lineage

`marketing_campaign_posts` remains available as direct campaign-to-post lineage for compatibility with the Campaign foundation. New planning flows should prefer the Content Item relationship so the strategic plan is preserved even before a Post exists.

## Boundary

Campaigns and Content Items do not yet implement:

- AI content generation
- weekly planning / Generate My Week
- customer actions
- attribution
- revenue measurement
- AI strategy or optimization
- automatic publishing

Those capabilities are deliberately sequenced after the planning foundation.
