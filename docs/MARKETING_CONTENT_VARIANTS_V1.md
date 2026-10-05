# Marketing Content Variants v1

## Purpose

A Content Item represents the shared marketing idea and planning intent. A Content Variant represents the platform-specific execution of that idea.

The relationship is:

`Campaign → Content Item → Channel Variant → Post → Post Target → Scheduler → Publisher`

## Why variants are separate

Facebook, Instagram, LinkedIn, Pinterest, and Google Business can require different copy treatment even when they promote the same campaign idea. The existing `posts` table is an execution object with one post body and multiple distribution targets, so channel-specific copy should be resolved before a Post is created rather than added to the scheduler.

## Storage

`marketing_content_item_variants` stores one optional variant per supported platform for a Content Item. Variants can have their own hook, body, CTA, and media reference while the Content Item retains the shared topic, angle, content type, and planning intent.

Media remains owned by the canonical `media_library` and products remain owned by Commerce `products`.

## AI Creator

`POST /api/marketing/generate-content` accepts an optional `platform`. When supplied, AI Creator adapts the copy to that platform while remaining grounded in the Business Brain.

AI generation is recommendation/content creation only. It does not publish or schedule.

## Publishing boundary

`POST /api/marketing/content-items/:id/create-post` accepts an optional `variantId`. When a variant is selected, every selected social account must belong to the variant's platform. The resulting normal Post then enters the existing Post Target/scheduler/publisher pipeline.

This prevents a single Post from incorrectly carrying one platform's copy to a different platform.

## Intentionally not included

- no new scheduler
- no platform-specific scheduler
- no replacement of Post Targets
- no customer-action or revenue attribution
- no AI Optimizer
- no automatic publishing

Future UI work can expose variant generation, editing, preview, and platform-aware Post creation without changing the execution engine.
