# Generate My Week v1

## Purpose

Generate My Week is Dizito's first AI-assisted marketing planning workflow. It combines Business Brain context with controlled AI strategy generation, user review/editing, and explicit approval persistence.

## Inputs

The planner uses Business Brain context including:

- business profile
- active marketing goals
- active offers
- canonical Commerce Products
- inventory context
- marketing assets
- connected social channels
- recent posts and publishing history

## Workflow

`Business Brain → AI Strategy → Review/Edit → AI Creator (optional) → Approve Week → Campaigns + Content Items`

The UI is intentionally review-first. The user can change campaign details, products, offers, content briefs, hooks, CTAs and full post copy before approval.

AI Creator v1 can generate editable publish-ready body copy for an individual Content Item from the Business Brain and campaign brief.

## Output

An approved weekly plan is persisted in `marketing_weekly_plans` with an ordered set of Campaign references. Campaigns and Content Items are created transactionally.

Generated Content Item bodies are persisted when supplied by the reviewed strategy.

## Approval boundary

Approval is a planning decision. It does not publish or schedule anything.

After approval, Content Items can be converted individually through the existing post creation flow. That flow creates normal `posts` and `post_targets` and hands execution to Dizito's existing scheduler/publishers.

## Current APIs

- `POST /api/marketing/generate-week` — recommendation-only weekly strategy
- `POST /api/marketing/generate-content` — recommendation-only Content Item copy
- `GET /api/marketing/weekly-plans`
- `GET /api/marketing/weekly-plans?weekStart=YYYY-MM-DD`
- `POST /api/marketing/weekly-plans`
- `POST /api/marketing/weekly-plans/approve`

## Safety boundaries

AI generation:

- must use supplied Business Brain context
- must not invent products, offers, prices, discounts, customer facts, URLs, guarantees or unsupported claims
- does not publish or schedule

Approval:

- is user-controlled
- is transactionally persisted
- rejects repeated approval of an already-approved week

Execution:

- remains in the existing Post/Post Target/scheduler/publisher architecture
- is not replaced by a new marketing scheduler

## Deliberate non-goals

V1 does not yet implement:

- channel-specific content variants
- automatic approval
- automatic publishing
- customer actions
- attribution or revenue measurement
- AI optimization/learning loops
- controlled autopilot
