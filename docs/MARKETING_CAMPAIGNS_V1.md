# Marketing Campaigns v1

## Purpose

Campaigns are the first persistent strategy layer above Dizito's existing post execution system.

A campaign represents the business reason and marketing plan behind a set of content and distribution actions.

## Model

`Campaign → Content → Post → Post Target → Scheduler → Publisher`

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

## Post lineage

`marketing_campaign_posts` provides the structural relationship between a campaign and execution-level posts. A post remains the existing publishing object and continues to use `post_targets`, the scheduler, and platform publishers.

## Boundary

Campaigns do not yet implement:

- content item planning
- AI generation
- weekly planning
- customer actions
- attribution
- revenue measurement
- AI strategy or optimization

Those layers are deliberately sequenced after the Campaign foundation.
