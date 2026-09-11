# Marketing Assets v1

## Purpose

Marketing Assets v1 evolves the existing Media Library into a semantic marketing asset layer without creating a second media store.

## Ownership

`media_library` remains the canonical media/file store. `marketing_asset_metadata` adds marketing meaning to an existing media record.

## Asset types

- general
- product
- service
- team
- customer
- testimonial
- logo
- offer
- lifestyle
- before_after
- video

## Product association

`marketing_asset_products` associates an asset with canonical Commerce Products. Marketing does not create a duplicate product catalog.

## AI use

`description` and `ai_context` provide reusable semantic context for future AI Creator and Generate My Week flows. v1 does not automatically generate or infer classifications.

## API

- `GET /api/marketing/assets`
- `GET /api/marketing/assets/:id`
- `POST /api/marketing/assets`

The POST endpoint classifies an existing media item and optionally associates canonical Commerce Products.

## Boundary

This layer does not replace Media Library UI/storage, generate campaigns, create weekly plans, or publish content. It gives Content Items and future AI strategy a semantic asset source to reuse before generating new media.
