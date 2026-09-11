# Generate My Week v1

## Purpose

Generate My Week is the first AI-assisted marketing planning workflow for Dizito. V1 establishes persistent weekly-plan storage and retrieval before introducing model-driven strategy generation or UI.

## Inputs

The eventual planner should use Business Brain context including:

- business profile
- active marketing goals
- active offers
- canonical Commerce Products
- inventory context
- marketing assets
- connected social channels
- recent posts and publishing history

## Output

A weekly plan is persisted in `marketing_weekly_plans`. It can contain a strategy summary, structured `plan_payload`, and an ordered set of Campaign references.

## Approval boundary

Weekly plans have an explicit `approved` state. Approval is a planning decision; it does not itself publish content. Future approval orchestration may convert approved Content Items into Posts and then hand execution to the existing scheduler.

## Current API

- `GET /api/marketing/weekly-plans`
- `GET /api/marketing/weekly-plans?weekStart=YYYY-MM-DD`
- `POST /api/marketing/weekly-plans`

## Deliberate non-goals

V1 does not yet:

- call an AI model to generate strategy
- automatically create campaigns from a model response
- generate images or copy
- create Posts
- schedule or publish anything
- measure customer actions or revenue
- optimize based on performance

This keeps planning persistence separate from AI generation and execution.
