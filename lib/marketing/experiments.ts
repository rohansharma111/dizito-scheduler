import { pool } from "@/lib/db";

export const EXPERIMENT_STATUSES = ["draft", "planned", "running", "completed", "cancelled"] as const;
export type MarketingExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export type MarketingExperiment = {
  id: number;
  userId: number;
  campaignId: number | null;
  contentItemId: number | null;
  variantId: number | null;
  name: string;
  hypothesis: string;
  changeDescription: string;
  metric: string;
  status: MarketingExperimentStatus;
  startsAt: string | null;
  endsAt: string | null;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentOutcome = {
  actionType: string;
  count: number;
  value: number;
};

const METRIC_ACTION_ALIASES: Record<string, string[]> = {
  lead: ["lead"],
  leads: ["lead"],
  booking: ["booking"],
  bookings: ["booking"],
  message: ["message"],
  messages: ["message"],
  call: ["call"],
  calls: ["call"],
  website_visit: ["website_visit"],
  website_visits: ["website_visit"],
  checkout: ["checkout"],
  checkouts: ["checkout"],
  order: ["order"],
  orders: ["order"],
  purchase: ["purchase"],
  purchases: ["purchase"],
  revenue: ["purchase", "order"],
  sales: ["purchase", "order"],
};

function metricActionTypes(metric: string) {
  const normalized = metric.toLowerCase().trim().replace(/-/g, "_").replace(/\s+/g, "_");
  const direct = METRIC_ACTION_ALIASES[normalized];
  if (direct) return direct;

  const tokens = normalized.split(/[^a-z0-9_]+/).filter(Boolean);
  const matched = tokens.flatMap((token) => METRIC_ACTION_ALIASES[token] ?? []);
  return matched.filter((actionType, index, values) => values.indexOf(actionType) === index);
}

export async function getMarketingExperimentOutcomes(userId: number, id: number): Promise<ExperimentOutcome[]> {
  const result = await pool.query(
    `SELECT a.action_type AS "actionType",
            COUNT(*)::int AS count,
            COALESCE(SUM(a.value), 0)::int AS value
       FROM marketing_customer_actions a
       JOIN marketing_experiments e ON e.user_id = a.user_id
      WHERE e.id = $2
        AND e.user_id = $1
        AND a.status = 'completed'
        AND (
          (e.variant_id IS NOT NULL AND a.variant_id = e.variant_id)
          OR (e.variant_id IS NULL AND e.content_item_id IS NOT NULL AND a.content_item_id = e.content_item_id)
          OR (e.variant_id IS NULL AND e.content_item_id IS NULL AND e.campaign_id IS NOT NULL AND a.campaign_id = e.campaign_id)
        )
      GROUP BY a.action_type
      ORDER BY count DESC`,
    [userId, id],
  );
  return result.rows as ExperimentOutcome[];
}

function outcomeSummary(outcomes: ExperimentOutcome[]) {
  if (!outcomes.length) return "No completed customer actions were observed for the linked experiment scope.";
  return outcomes.map((item) => `${item.actionType}: ${item.count} action${item.count === 1 ? "" : "s"}, observed value ${item.value}`).join("; ");
}


export type CompletedExperimentEvidence = MarketingExperiment & {
  outcomes: ExperimentOutcome[];
  metricEvidence: ExperimentOutcome[];
};

export async function listCompletedExperimentEvidence(userId: number): Promise<CompletedExperimentEvidence[]> {
  const result = await pool.query(
    `SELECT e.id,
            e.user_id AS "userId",
            e.campaign_id AS "campaignId",
            e.content_item_id AS "contentItemId",
            e.variant_id AS "variantId",
            e.name,
            e.hypothesis,
            e.change_description AS "changeDescription",
            e.metric,
            e.status,
            e.starts_at AS "startsAt",
            e.ends_at AS "endsAt",
            e.result_summary AS "resultSummary",
            e.created_at AS "createdAt",
            e.updated_at AS "updatedAt",
            COALESCE(
              json_agg(
                json_build_object(
                  'actionType', action_stats.action_type,
                  'count', action_stats.count,
                  'value', action_stats.value
                )
                ORDER BY action_stats.count DESC, action_stats.action_type
              ) FILTER (WHERE action_stats.action_type IS NOT NULL),
              '[]'::json
            ) AS outcomes,
            COALESCE(
              json_agg(
                json_build_object(
                  'actionType', metric_stats.action_type,
                  'count', metric_stats.count,
                  'value', metric_stats.value
                )
                ORDER BY metric_stats.count DESC, metric_stats.action_type
              ) FILTER (WHERE metric_stats.action_type IS NOT NULL),
              '[]'::json
            ) AS "metricEvidence"
       FROM marketing_experiments e
       LEFT JOIN LATERAL (
         SELECT a.action_type,
                COUNT(*)::int AS count,
                COALESCE(SUM(a.value), 0)::int AS value
           FROM marketing_customer_actions a
          WHERE a.user_id = e.user_id
            AND a.status = 'completed'
            AND (
              (e.variant_id IS NOT NULL AND a.variant_id = e.variant_id)
              OR (e.variant_id IS NULL AND e.content_item_id IS NOT NULL AND a.content_item_id = e.content_item_id)
              OR (e.variant_id IS NULL AND e.content_item_id IS NULL AND e.campaign_id IS NOT NULL AND a.campaign_id = e.campaign_id)
            )
            AND (e.starts_at IS NULL OR a.occurred_at >= e.starts_at)
            AND (e.ends_at IS NULL OR a.occurred_at <= e.ends_at)
          GROUP BY a.action_type
       ) action_stats ON true
       LEFT JOIN LATERAL (
         SELECT a.action_type,
                COUNT(*)::int AS count,
                COALESCE(SUM(a.value), 0)::int AS value
           FROM marketing_customer_actions a
          WHERE a.user_id = e.user_id
            AND a.status = 'completed'
            AND (
              (e.variant_id IS NOT NULL AND a.variant_id = e.variant_id)
              OR (e.variant_id IS NULL AND e.content_item_id IS NOT NULL AND a.content_item_id = e.content_item_id)
              OR (e.variant_id IS NULL AND e.content_item_id IS NULL AND e.campaign_id IS NOT NULL AND a.campaign_id = e.campaign_id)
            )
            AND (e.starts_at IS NULL OR a.occurred_at >= e.starts_at)
            AND (e.ends_at IS NULL OR a.occurred_at <= e.ends_at)

          GROUP BY a.action_type
       ) metric_stats ON true
      WHERE e.user_id = $1
        AND e.status = 'completed'
      GROUP BY e.id
      ORDER BY e.ends_at DESC NULLS LAST, e.id DESC
      LIMIT 50`,
    [userId],
  );
  return result.rows.map((row) => {
    const metricTypes = new Set(metricActionTypes(String(row.metric)));
    const metricEvidence = (row.metricEvidence as ExperimentOutcome[]).filter((outcome) => metricTypes.has(outcome.actionType));
    return {
      ...(row as Omit<CompletedExperimentEvidence, "outcomes" | "metricEvidence">),
      outcomes: row.outcomes as ExperimentOutcome[],
      metricEvidence,
    };
  });
}

export async function listMarketingExperiments(userId: number, status?: MarketingExperimentStatus) {
  const result = await pool.query("SELECT id, user_id AS \"userId\", campaign_id AS \"campaignId\", content_item_id AS \"contentItemId\", variant_id AS \"variantId\", name, hypothesis, change_description AS \"changeDescription\", metric, status, starts_at AS \"startsAt\", ends_at AS \"endsAt\", result_summary AS \"resultSummary\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM marketing_experiments WHERE user_id = $1 AND ($2::text IS NULL OR status = $2) ORDER BY starts_at DESC NULLS LAST, id DESC LIMIT 200", [userId, status ?? null]);
  return result.rows as MarketingExperiment[];
}

export async function getMarketingExperiment(userId: number, id: number) {
  const result = await pool.query("SELECT id, user_id AS \"userId\", campaign_id AS \"campaignId\", content_item_id AS \"contentItemId\", variant_id AS \"variantId\", name, hypothesis, change_description AS \"changeDescription\", metric, status, starts_at AS \"startsAt\", ends_at AS \"endsAt\", result_summary AS \"resultSummary\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM marketing_experiments WHERE user_id = $1 AND id = $2", [userId, id]);
  return (result.rows[0] as MarketingExperiment | undefined) ?? null;
}

export async function updateMarketingExperiment(userId: number, id: number, input: { status?: MarketingExperimentStatus; resultSummary?: string | null; startsAt?: string | null; endsAt?: string | null }) {
  const current = await getMarketingExperiment(userId, id);
  if (!current) return null;
  const status = input.status ?? current.status;
  if (current.status === "cancelled" && status !== "cancelled") throw new Error("Cancelled experiments cannot be reopened");
  const outcomes = status === "completed" ? await getMarketingExperimentOutcomes(userId, id) : [];
  if (status === "completed" && !input.resultSummary && !current.resultSummary && outcomes.length === 0) throw new Error("Completed experiments require observed outcomes or a result summary");
  const storedSummary = input.resultSummary ?? current.resultSummary ?? (status === "completed" ? outcomeSummary(outcomes) : null);
  const result = await pool.query("UPDATE marketing_experiments SET status=$3, result_summary=$4, starts_at=$5, ends_at=$6, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id, user_id AS \"userId\", campaign_id AS \"campaignId\", content_item_id AS \"contentItemId\", variant_id AS \"variantId\", name, hypothesis, change_description AS \"changeDescription\", metric, status, starts_at AS \"startsAt\", ends_at AS \"endsAt\", result_summary AS \"resultSummary\", created_at AS \"createdAt\", updated_at AS \"updatedAt\"", [id, userId, status, storedSummary, input.startsAt ?? current.startsAt, input.endsAt ?? current.endsAt]);
  return result.rows[0] as MarketingExperiment;
}
