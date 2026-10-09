# UI Screen Visual Polish — Create Post + Content Calendar

**Date:** 2026-10-09  
**Branch:** `main` (follow-up committed directly to main)  
**Scope:** presentation-only changes based on the supplied screenshots.

## Follow-up: Draft Posts + Scheduled / Published Posts (2026-10-09)

- Added shared scoped styling in `components/PostLists.module.css` and applied it to `components/DraftPosts.tsx` and `components/ScheduledPosts.tsx`.
- Improved empty-state surfaces, section headings, table headers/rows/borders, action focus states, and lime primary empty-state links.
- Direct-main commits: `ff9c0df30db95b57b63592698092c09c3bb9f0c0`, `94d047aca6815da6c121e20c4bf939dba1121b55`, `5dbd380ae6538a5d2db36501ebe0b6f0308b5856`.
- Automated checks and browser visual verification for this follow-up are pending.

## Follow-up: Publish Details modal (2026-10-09)

- Polished the publish-details modal with a softened overlay, elevated rounded panel, clearer summary, refined account cards, status/error callouts, and consistent retry/reconnect buttons.
- Added `components/PublishDetailsModal.module.css` for subtle entry motion and responsive details; reduced-motion preference is respected.
- Direct-main commits: `a5e0bffb38184f1dbf81c96810519bc99968850b`, `f57b1a2ae4a06b27d2cd85f96c379a9762146e8e`.
- Existing publish/retry/reconnect logic is unchanged. Automated checks and browser verification are pending.

## Follow-up: narrow-screen Drafts action row (2026-10-09)

- Tightened the five-action mobile grid and switched action labels to compact responsive visibility so words do not wrap character-by-character on very narrow devices. Added accessible action names and visible keyboard focus.
- Commit: `637b2769fae283cc28d1854a31ae995401dbb99e`.
- Draft action handlers remain unchanged. Verification pending.
- The supplied commerce screenshots also reveal product/variant tables collapsing into narrow columns. The exact component routes must be identified before making a safe targeted fix; no broad global table override was added.

## Follow-up: mobile commerce table readability (2026-10-09)

- Root cause: global `body { overflow-wrap: anywhere; }` split normal words and table headings into individual characters on narrow viewports. Changed the global body rule to `overflow-wrap: normal` while retaining code-token wrapping.
- Added min-widths within horizontal scroll containers to products (640px), variants (680px), and inventory (900px). Product variant header stacks on mobile with a full-width Add Variant action.
- Commits: `7666e3bc44e904324480020310bd4436d4b9f10a`, `1e6b318d9e36b83b04831c1775679a75fc54e556`, `284a68f00b4203e0b0462f5731caf4956bf2f8ab`, `721f97d5d1d03e1b110927f9a60f630e1099ea20`, `f6222b8802ebd668a9549b4e5ce3f5860f5aa717`.
- No product, variant, or inventory logic changed. Checks and browser/device visual QA remain pending.

## Follow-up: reusable pagination across data tables (2026-10-09)

- Added `components/dizito/TablePagination.tsx` and applied it to Bulk Upload preview, Products, Variants, Inventory, Inventory Movement History, Draft Posts, and Scheduled/Published Posts.
- Bulk Upload adds All / Valid / Invalid / Duplicates filters, preserves original CSV row numbers, and scopes the header checkbox to valid rows on the current page while preserving selections across pages.
- Pagination currently operates client-side on the loaded dataset; server-side query pagination remains necessary for genuinely large datasets.
- Direct-main commits include `8cbeda7`, `d88c2f2`, `a570ce7`, `b4f93b1`, `21f8294`, `48cfb40`, `4c9272f`, `d849a78`, and `4745503`.
- Automated checks and browser QA are pending.

## Follow-up: public homepage, pricing and footer (2026-10-09)

- Reworked the marketing homepage with a responsive hero, clear CTAs, channel chips, feature cards, workflow steps, product walkthrough and final CTA, using Dizito's violet/lime/soft-neutral design language.
- Refined the public header and footer for alignment, responsive layout, and accessible focus states.
- Rebalanced pricing cards with a fixed Recommended-badge row, aligned headings/prices, clearer feature states, and consistent CTA styling. Billing logic and prices remain data-driven.
- Removed the duplicate root page route (`app/page.tsx`) so `app/(marketing)/page.tsx` is the single canonical route for `/`.
- Branch `v1/public-pages-visual-polish`; Validate and Quality Checks passed on code commit `871200b9f894db6a1066165dedd12577266a69e4` (tests, lint, TypeScript, build). Browser visual verification remains pending.

## Screens covered

- Create Post form in `components/CreatePostForm.tsx`
- Media picker presentation when embedded in the Create Post form, scoped by `components/CreatePostForm.module.css` without changing the shared media-picker component.
- Calendar and selected-day content in `components/PostCalendar.tsx`, with locally scoped calendar styles in `components/PostCalendar.module.css`.

## Visual changes

- Replaced hard, dark borders and default blue action styling with Dizito's rounded surfaces, soft slate borders, violet focus/selection states, and lime primary actions.
- Improved textarea, schedule input, account-selection cards, loading/disabled action affordances, media picker frame, and success feedback.
- Styled the calendar month navigation, weekdays, day tiles, selected/today states, and post-count labels.
- Rebalanced the desktop calendar into a calendar + selected-day layout; refined the mobile upcoming-post cards.
- Preserved the current responsive breakpoint and mobile upcoming-post behavior.

## Behavior intentionally preserved

No API routes, request payloads, persistence models, schedule-time conversion, account-selection rules, validation alerts, post refresh flow, draft/schedule action handlers, publish-details modal, or provider behavior were intentionally changed. Calendar date selection, post counting, status display, and upcoming-post filtering remain based on the existing data and state.

## Verification boundary

- Source changes were submitted on an isolated branch and are intended to be presentation-only.
- Automated tests, lint, TypeScript, production build, and browser/mobile visual verification have **not** been run in this environment.
- Review the generated PR diff and run the repository's fresh CI checks before merging. Do not treat this document as evidence of runtime verification.
