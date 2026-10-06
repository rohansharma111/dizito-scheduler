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
  if (status === "completed" && !input.resultSummary && !current.resultSummary) throw new Error("Completed experiments require a result summary");
  const result = await pool.query("UPDATE marketing_experiments SET status=$3, result_summary=$4, starts_at=$5, ends_at=$6, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id, user_id AS \"userId\", campaign_id AS \"campaignId\", content_item_id AS \"contentItemId\", variant_id AS \"variantId\", name, hypothesis, change_description AS \"changeDescription\", metric, status, starts_at AS \"startsAt\", ends_at AS \"endsAt\", result_summary AS \"resultSummary\", created_at AS \"createdAt\", updated_at AS \"updatedAt\"", [id, userId, status, input.resultSummary ?? current.resultSummary, input.startsAt ?? current.startsAt, input.endsAt ?? current.endsAt]);
  return result.rows[0] as MarketingExperiment;
}
