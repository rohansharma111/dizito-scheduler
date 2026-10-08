# Dizito Infrastructure + Database + Observability Audit

**Workstream:** H — Database + Infrastructure + Observability  
**Status:** Beta-scale audit / hardening  
**Branch:** `v1/infrastructure-observability`  
**Date:** 2026-10-08

## Reconciliation note — 2026-10-08

Current main already owns migration `021_billing_v1_plans_entitlements.sql`. The original H production enablement used Neon migration 021 before this parallel-workstream collision was visible. During branch reconciliation, the same idempotent observability SQL is therefore represented as repository migration `022_infrastructure_observability_v1.sql` so the migration runner has a unique filename on the current main lineage. The production database changes are already present; migration 022 must not be treated as evidence that those production changes were newly applied.

## 1. Scope

This workstream audits the current Dizito beta stack without migrating Neon, Vercel, Cloudinary, or introducing a distributed worker system prematurely.

Current stack:

`Vercel → Neon Postgres`

with Cloudinary for media, Razorpay for billing, provider APIs for publishing, and the existing scheduler route.

## 2. Evidence boundary

### Direct repository evidence

- `lib/db.ts` creates one module-level `pg.Pool` from `DATABASE_URL`.
- The scheduler route processes up to **20 targets sequentially** per invocation.
- Scheduler recovery resets `processing` targets older than **15 minutes**.
- `claimTargets()` uses `FOR UPDATE SKIP LOCKED`, preserving concurrent-claim safety.
- `post_target_attempts` is queried by `post_target_id` on every recorded attempt.
- `/api/activity` queries `system_events` by `user_id` and orders by `created_at DESC`.
- `/api/billing` queries `billing_events` by `user_id` and orders by `created_at DESC`.
- `publish_logs`, `post_target_attempts`, and `system_events` are append-heavy operational/event surfaces.
- The repository's reference schema documents the 46-table domain and its current index set.
- No destructive SQL was executed by this workstream.

### Live Neon evidence — 2026-10-08

The active project is Neon project `purple-wildflower-87394884`, default branch `production`, database `neondb`.

Observed control-plane state:

- Neon PostgreSQL **18.6**.
- Neon logical size reported by the project/branch: **36,601,856 bytes (~34.9 MiB)**. This is larger than the earlier ~12 MB project observation, so the live catalog is now the authoritative measurement for this audit.
- **46 public tables**.
- **156 indexes**.
- Project autoscaling: **0.25–2 CU**.
- Compute time in the current consumption period: **5,916 s**.
- Active time: **22,480 s**.
- Data transfer: **1,055,592 bytes**.
- No long-running query >5 minutes observed.
- No active/stalled query >30 seconds observed.
- No locks reported by the Neon lock diagnostic at audit time.
- Four client connections observed: **1 active, 3 idle**; the connection snapshot reported 3 with a wait event.
- `pg_stat_statements` is **not installed**. The read-only Neon diagnostics that depend on it therefore could not run.

Current high-value table counts:

| Table | Rows | Oldest | Newest |
|---|---:|---|---|
| `system_events` | 270 | 2026-06-28 | 2026-10-06 |
| `publish_logs` | 112 | 2026-06-27 | 2026-10-06 |
| `payment_webhook_events` | 55 | 2026-09-05 | 2026-09-08 |
| `post_target_attempts` | 6 | 2026-07-07 | 2026-10-06 |
| `billing_events` | 0 | — | — |

All 55 payment webhook rows are currently `processed`. There are no due scheduler targets at audit time.

The current payment webhook table is approximately **168 kB**, `system_events` approximately **104 kB**, and `publish_logs` approximately **48 kB`. No retention pressure exists at current volume.

Autovacuum/dead-tuple diagnostics show small absolute dead-tuple counts. For example, `system_events` has 10 dead rows and `payment_webhook_events` 26 dead rows. Estimated bloat is negligible at current table sizes; the largest reported waste was about **40 kB** on `payment_webhook_events`.

## 3. Query observability and index findings

### 3.1 `pg_stat_statements` — enabled

After explicit approval, the production observability SQL (executed during the original H enablement as migration 021; reconciled in source as migration 022) was tested on a temporary Neon branch and applied to the production/default branch.

Live verification reports `pg_stat_statements` version **1.12**. It is now available for cumulative query-time and call-rate diagnostics.

The first post-enable statistics snapshot is dominated by migration/control-plane statements, so it is not yet a representative application workload ranking.

### 3.2 Evidence-backed indexes

Live `EXPLAIN` was run before and after a temporary-branch test migration.

Before the indexes:

- `system_events WHERE user_id = 3 ORDER BY created_at DESC LIMIT 20` used a sequential scan plus sort.
- `billing_events WHERE user_id = 3 ORDER BY created_at DESC LIMIT 10` used a sequential scan plus sort.

On a temporary Neon branch, the two indexes changed those plans to index scans:

1. `idx_system_events_user_created_at`
   - `(user_id, created_at DESC)`;
   - directly matches the existing `/api/activity` predicate/order.

2. `idx_billing_events_user_created_at`
   - `(user_id, created_at DESC)`;
   - directly matches the existing billing-history predicate/order.

Migration 021 was then applied to the production/default branch. Live verification confirms both indexes exist.

### 3.3 Attempt-count index deliberately deferred

The live plan for:

`SELECT COUNT(*) FROM post_target_attempts WHERE post_target_id = 1`

still chose a sequential scan after testing `idx_post_target_attempts_target` on the temporary branch because the table is tiny.

Therefore the attempt index was removed from the production observability SQL (executed during the original H enablement as migration 021; reconciled in source as migration 022). The query shape is worth monitoring as attempt volume grows, but adding the index now is not justified by the measured plan.

### 3.4 Scheduler query

The scheduler claim query currently plans as small sequential scans/hash join/sort with a total estimated cost of only about **2.37** at current cardinality.

Do **not** add `posts.schedule_time` or `post_targets(status, ...)` indexes yet. There is no live performance evidence that they are a bottleneck at current volume.

This is an explicit example of the audit rule: query shape alone is not enough; the live plan and measured workload must justify the index.

## 4. Indexes deliberately NOT added yet

Do **not** add scheduler indexes merely because the scheduler is important.

Candidate areas requiring future `EXPLAIN` + query-statistics evidence:

- `post_targets` due/retry selection;
- `posts.schedule_time`;
- `post_target_attempts(post_target_id)` if attempt volume materially grows;
- `subscriptions` composite user/status access;
- `social_accounts` tenant/status access;
- `payment_webhook_events` processing/retry access;
- any commerce listing/sync indexes.

Every extra index increases write work and storage. Current evidence does not justify these additions.

## 5. Tenant constraints

The reference schema has tenant ownership through `user_id` on root entities and foreign keys for many child entities.

Important observations:

- Child tables such as post targets, attempt history, order items, listing variants/media, and channel credentials are intentionally reached through tenant-owned parents/channels rather than duplicating `user_id` everywhere.
- This is compatible with the current domain model and should not be replaced with a premature universal `tenant_id` migration.
- Tenant-isolation correctness still depends on application queries validating ownership at the resource boundary. Database foreign keys alone do not prove API authorization.
- This workstream therefore does not add a blanket `tenant_id` column or RLS migration.

## 6. Event/log growth and retention

Current operational growth surfaces:

| Surface | Current live volume | Proposed beta policy | Trigger for implementation |
|---|---:|---|---|
| `system_events` | 270 | retain 90–180 days after useful product history is established; aggregate durable metrics separately | implement once row-growth rate is measurable |
| `publish_logs` | 112 | retain 90–180 days for operational debugging; keep aggregate publish metrics longer | implement after measuring monthly growth |
| `post_target_attempts` | 6 | retain 180 days or tie retention to post-target lifecycle | implement after attempt-volume measurement |
| `billing_events` | 0 | do not auto-delete based only on infrastructure pressure; define accounting/legal retention first | explicit billing/legal policy |
| `payment_webhook_events` | 55, all processed | retain long enough for reconciliation/support and legal requirements; do not purge blindly | explicit billing/webhook policy |
| `scheduler_heartbeat` | single operational row | retain current row; no retention work required | none |

These are recommendations, not legal-retention claims. No retention deletion job was added because current volume is tiny and the required retention policy is not established.

## 7. Slow-query and connection observability plan

After deliberate enablement of `pg_stat_statements` and representative beta traffic, inspect:

1. top cumulative execution time;
2. top call-count queries;
3. mean and p95 query latency;
4. sequential scans;
5. unused indexes;
6. long/stalled queries;
7. locks;
8. autovacuum/dead tuples;
9. Neon Local File Cache hit rate and working set;
10. connection count/connection errors.

Preferred Neon signal:

- LFC hit rate target: **≥99%** under representative workload.
- A sustained drop below 99% or a working set larger than LFC is a compute-sizing signal.

## 8. Scaling thresholds

These are **Dizito operating thresholds**, not vendor-imposed limits.

### Neon

Do not scale for storage alone.

Escalate compute/autoscaling when any of these persists under representative load:

- p95 DB query latency > **250 ms** for user-facing queries;
- p95 scheduler DB phase > **500 ms** before provider calls;
- repeated connection saturation/rejection;
- LFC hit rate < **99%**;
- working set exceeds available LFC;
- sustained compute utilization causes queue/backlog growth rather than absorbing it;
- a single query dominates cumulative DB time or exceeds **1 s mean** at meaningful call volume.

Current project autoscaling is 0.25–2 CU, so the first response to measured compute pressure should be sizing/autoscaling review rather than database migration.

### Vercel

For the current scheduler route, measure end-to-end duration and target a safety margin:

- warning: p95 invocation > **60 s**;
- action: p95 > **120 s** or p99 > **180 s**;
- queue/worker decision: p95 > **50% of the configured function max duration**, or due-target backlog grows across consecutive scheduler cycles.

A worker is justified by measured background-work pressure, not by database size.

### Cloudinary

Do not upgrade based on storage alone.

Trigger an upgrade review when any of:

- rolling 30-day credit usage > **70%** of included allocation;
- repeated > **85%** usage for two measurement periods;
- video bandwidth or transformation usage becomes the dominant cost/limit;
- an upload/transformation limit blocks a required V1 workflow.

Actual account usage must be read from Cloudinary before changing plans.

### Queue / workers

Do not introduce durable workers yet.

Introduce the queue boundary when at least one measured condition persists:

- scheduler p95 exceeds **50%** of function max duration;
- oldest due target is delayed by > **2 scheduler intervals**;
- due backlog exceeds **2× the per-cycle batch size** for multiple cycles;
- provider API waits dominate execution and prevent predictable request completion;
- retries/ambiguous provider outcomes require durable delayed work independent of HTTP invocation lifetime;
- one invocation consistently needs more work than can safely fit inside its runtime budget.

Target architecture remains:

`Vercel API → durable queue → workers → provider APIs → reconciliation`

## 9. Vercel connection behavior

The repository uses `pg` with a module-level pool, but the value of `DATABASE_URL` is not visible here.

Live Neon showed only four client connections at the audit instant, so there is no evidence of connection saturation.

Therefore:

- do not claim whether the current Vercel deployment uses Neon direct or pooled connections;
- if live connection pressure appears, prefer Neon's pooled/PgBouncer endpoint;
- measure active connections and rejected connections before changing pool sizing;
- do not create a custom connection proxy prematurely.

## 10. Backup / recovery

The live Neon project was confirmed, but this audit did not perform a restore or establish a successful production restore drill.

Required beta gate:

1. verify automated Neon backup/PITR configuration in the active plan;
2. establish RPO;
3. establish RTO;
4. perform a non-production restore/branch drill;
5. verify representative row counts and critical relationships;
6. document the last successful drill date.

No destructive restore, drop, truncate, delete, or production migration was executed.

## 11. Vercel runtime observations

The current scheduler is request-bound and sequential:

`recover → claim ≤20 → publish target 1 → publish target 2 → … → heartbeat`

This is acceptable for tiny beta volume, but it is not proof of production-scale throughput.

Vercel runtime/concurrency telemetry is not available through the current connected tooling, so no runtime capacity claim is made.

Measure before changing:

- p50/p95/p99 duration;
- provider wait time;
- DB time;
- number of targets;
- success/failure/retry counts;
- invocation overlap.

## 12. Recommended monitoring dashboard

Track at minimum:

### Database
- p95/p99 query duration;
- top cumulative query time;
- calls/query;
- sequential scans;
- unused indexes;
- LFC hit rate;
- active/rejected connections;
- dead tuples/autovacuum;
- database/table/index size.

### Scheduler
- cycle duration;
- claimed/published/failed/retried;
- oldest due target age;
- due backlog;
- recovery count;
- overlapping invocations.

### Billing/webhooks
- received/processed/failed webhook counts;
- unprocessed webhook age;
- duplicate webhook rate.

### Media
- Cloudinary storage;
- 30-day transformations;
- 30-day bandwidth;
- video processing/bandwidth share.

## 13. Recovery and escalation order

1. Fix query/index issue.
2. Tune connection behavior/pooling.
3. Tune Neon autoscaling/compute.
4. Tune Vercel function duration/runtime settings.
5. Reduce batch size or provider concurrency if provider APIs are the bottleneck.
6. Introduce durable queue/workers when measured runtime/backlog conditions are met.
7. Add read replicas only for a measured read-scaling need.

Do not migrate providers as a first response to a performance problem.

## 14. Final audit conclusion

Current live evidence supports **continued beta operation on Vercel + Neon + Cloudinary**.

The live Neon logical size is ~35 MiB with only tiny application row counts, and there is no observed long-running/stalled query, lock contention, scheduler backlog, or connection saturation. No infrastructure migration is justified.

Two query indexes are strongly justified by actual plan improvement and are **applied to production**. `pg_stat_statements` version 1.12 is also **enabled**.

The primary near-term risk remains operational visibility: query behavior, event/log growth, scheduler duration, connection pressure, and provider wait time.

This workstream intentionally leaves:
- provider adapters;
- billing business logic;
- media workflows;
- marketing UI;
- distributed workers

unchanged.

Remaining evidence gaps are Vercel runtime/concurrency telemetry, Cloudinary usage, a documented backup/restore drill, and representative post-enable application workload in `pg_stat_statements`.

