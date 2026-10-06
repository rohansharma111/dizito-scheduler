import { pool } from "@/lib/db";
import { getExperimentLearningSignal, listCompletedExperimentEvidence } from "@/lib/marketing/experiments";

export type MarketingCampaign = {
  id: number;
  userId: number;
  goalId: number | null;
  offerId: number | null;
  name: string;
  objective: string | null;
  audience: string | null;
  cta: string | null;
  channelStrategy: Record<string, unknown>;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  productIds: number[];
  postIds: number[];
  contentItemCounts: {
    draft: number;
    planned: number;
    ready: number;
    converted: number;
    archived: number;
  };
  contentReadiness: {
    total: number;
    needsApproval: number;
    readyToSchedule: number;
    converted: number;
  };
  experimentSummary: { total: number; running: number; completed: number; planned: number };
  experimentLearning: Array<{ id: number; name: string; metric: string; learningSignal: "positive" | "negative" | "insufficient"; resultSummary: string | null }>;
  observedImpact: {
    actionCount: number;
    actionValue: number;
    linkedOrderCount: number;
    linkedOrderValue: number;
    actionBreakdown: Array<{ actionType: string; count: number; value: number }>;
    attributedActionCount: number;
    attributedValue: number;
    attributedOrderCount: number;
    attributedActionBreakdown: Array<{ actionType: string; count: number; value: number }>;
  };
  createdAt: string;
  updatedAt: string;
};

export async function listCampaigns(userId: number): Promise<MarketingCampaign[]> {
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.goal_id, c.offer_id, c.name, c.objective, c.audience,
            c.cta, c.channel_strategy, c.status, c.starts_at, c.ends_at,
            c.created_at, c.updated_at,
            COALESCE(array_agg(DISTINCT cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), '{}') AS product_ids,
            COALESCE(array_agg(DISTINCT cpo.post_id) FILTER (WHERE cpo.post_id IS NOT NULL), '{}') AS post_ids,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'draft')::int AS content_draft_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'planned')::int AS content_planned_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'ready')::int AS content_ready_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'converted')::int AS content_converted_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'archived')::int AS content_archived_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id) AS experiment_total_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'running') AS experiment_running_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'completed') AS experiment_completed_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'planned') AS experiment_planned_count,
            (SELECT COUNT(*)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_value,
            (SELECT COUNT(DISTINCT ca.order_id)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_value,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.action_value) ORDER BY x.action_count DESC), '[]'::json)
               FROM (
                 SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(ca.value),0)::int AS action_value
                   FROM marketing_customer_actions ca
                  WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed'
                  GROUP BY ca.action_type
               ) x) AS observed_action_breakdown,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status IN ('draft','planned','ready','converted')) AS content_total_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status IN ('draft','planned')) AS content_needs_approval_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status = 'ready') AS content_ready_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status = 'converted') AS content_converted_count,
            (SELECT COUNT(*)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_action_count,
            (SELECT COALESCE(SUM(a.attributed_value),0)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_value,
            (SELECT COUNT(DISTINCT a.order_id)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' AND a.order_id IS NOT NULL) AS attributed_order_count,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.attributed_value) ORDER BY x.action_count DESC), '[]'::json) FROM (SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(a.attributed_value),0)::int AS attributed_value FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' GROUP BY ca.action_type) x) AS attributed_action_breakdown
       FROM marketing_campaigns c
       LEFT JOIN marketing_campaign_products cp ON cp.campaign_id = c.id
       LEFT JOIN marketing_campaign_posts cpo ON cpo.campaign_id = c.id
       LEFT JOIN marketing_content_items ci ON ci.campaign_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC`,
    [userId],
  );

  const campaigns = result.rows.map(mapCampaign);
  const evidence = await listCompletedExperimentEvidence(userId);
  const byCampaign = new Map<number, MarketingCampaign["experimentLearning"]>();
  for (const experiment of evidence) {
    if (experiment.campaignId == null) continue;
    const list = byCampaign.get(experiment.campaignId) ?? [];
    list.push({ id: experiment.id, name: experiment.name, metric: experiment.metric, learningSignal: getExperimentLearningSignal(experiment), resultSummary: experiment.resultSummary });
    byCampaign.set(experiment.campaignId, list);
  }
  return campaigns.map((campaign) => ({ ...campaign, experimentLearning: byCampaign.get(campaign.id) ?? [] }));
}

export async function getCampaign(userId: number, campaignId: number): Promise<MarketingCampaign | null> {
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.goal_id, c.offer_id, c.name, c.objective, c.audience,
            c.cta, c.channel_strategy, c.status, c.starts_at, c.ends_at,
            c.created_at, c.updated_at,
            COALESCE(array_agg(DISTINCT cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), '{}') AS product_ids,
import { pool } from "@/lib/db";

export type MarketingCampaign = {
  id: number;
  userId: number;
  goalId: number | null;
  offerId: number | null;
  name: string;
  objective: string | null;
  audience: string | null;
  cta: string | null;
  channelStrategy: Record<string, unknown>;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  productIds: number[];
  postIds: number[];
  contentItemCounts: {
    draft: number;
    planned: number;
    ready: number;
    converted: number;
    archived: number;
  };
  contentReadiness: {
    total: number;
    needsApproval: number;
    readyToSchedule: number;
    converted: number;
  };
  experimentSummary: { total: number; running: number; completed: number; planned: number };
  observedImpact: {
    actionCount: number;
    actionValue: number;
    linkedOrderCount: number;
    linkedOrderValue: number;
    actionBreakdown: Array<{ actionType: string; count: number; value: number }>;
    attributedActionCount: number;
    attributedValue: number;
    attributedOrderCount: number;
    attributedActionBreakdown: Array<{ actionType: string; count: number; value: number }>;
  };
  createdAt: string;
  updatedAt: string;
};

export async function listCampaigns(userId: number): Promise<MarketingCampaign[]> {
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.goal_id, c.offer_id, c.name, c.objective, c.audience,
            c.cta, c.channel_strategy, c.status, c.starts_at, c.ends_at,
            c.created_at, c.updated_at,
            COALESCE(array_agg(DISTINCT cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), '{}') AS product_ids,
            COALESCE(array_agg(DISTINCT cpo.post_id) FILTER (WHERE cpo.post_id IS NOT NULL), '{}') AS post_ids,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id) AS experiment_total_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'running') AS experiment_running_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'completed') AS experiment_completed_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'planned') AS experiment_planned_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'draft')::int AS content_draft_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'planned')::int AS content_planned_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'ready')::int AS content_ready_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'converted')::int AS content_converted_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'archived')::int AS content_archived_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id) AS experiment_total_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'running') AS experiment_running_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'completed') AS experiment_completed_count,
            (SELECT COUNT(*)::int FROM marketing_experiments e WHERE e.user_id = c.user_id AND e.campaign_id = c.id AND e.status = 'planned') AS experiment_planned_count,
            (SELECT COUNT(*)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_value,
            (SELECT COUNT(DISTINCT ca.order_id)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_value,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.action_value) ORDER BY x.action_count DESC), '[]'::json)
               FROM (
                 SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(ca.value),0)::int AS action_value
                   FROM marketing_customer_actions ca
                  WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed'
                  GROUP BY ca.action_type
               ) x) AS observed_action_breakdown,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status IN ('draft','planned','ready','converted')) AS content_total_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status IN ('draft','planned')) AS content_needs_approval_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status = 'ready') AS content_ready_count,
            (SELECT COUNT(*)::int FROM marketing_content_items r WHERE r.campaign_id = c.id AND r.user_id = c.user_id AND r.status = 'converted') AS content_converted_count,
            (SELECT COUNT(*)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_action_count,
            (SELECT COALESCE(SUM(a.attributed_value),0)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_value,
            (SELECT COUNT(DISTINCT a.order_id)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' AND a.order_id IS NOT NULL) AS attributed_order_count,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.attributed_value) ORDER BY x.action_count DESC), '[]'::json) FROM (SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(a.attributed_value),0)::int AS attributed_value FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' GROUP BY ca.action_type) x) AS attributed_action_breakdown
       FROM marketing_campaigns c
       LEFT JOIN marketing_campaign_products cp ON cp.campaign_id = c.id
       LEFT JOIN marketing_campaign_posts cpo ON cpo.campaign_id = c.id
       LEFT JOIN marketing_content_items ci ON ci.campaign_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC`,
    [userId],
  );

  return result.rows.map(mapCampaign);
}

export async function getCampaign(userId: number, campaignId: number): Promise<MarketingCampaign | null> {
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.goal_id, c.offer_id, c.name, c.objective, c.audience,
            c.cta, c.channel_strategy, c.status, c.starts_at, c.ends_at,
            c.created_at, c.updated_at,
            COALESCE(array_agg(DISTINCT cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), '{}') AS product_ids,

            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'planned')::int AS content_planned_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'ready')::int AS content_ready_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'converted')::int AS content_converted_count,
            COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'archived')::int AS content_archived_count,
            (SELECT COUNT(*)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed') AS observed_action_value,
            (SELECT COUNT(DISTINCT ca.order_id)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_count,
            (SELECT COALESCE(SUM(ca.value),0)::int FROM marketing_customer_actions ca WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed' AND ca.order_id IS NOT NULL) AS linked_order_value,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.action_value) ORDER BY x.action_count DESC), '[]'::json)
               FROM (
                 SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(ca.value),0)::int AS action_value
                   FROM marketing_customer_actions ca
                  WHERE ca.user_id = c.user_id AND ca.campaign_id = c.id AND ca.status = 'completed'
                  GROUP BY ca.action_type
               ) x) AS observed_action_breakdown,
            (SELECT COUNT(*)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_action_count,
            (SELECT COALESCE(SUM(a.attributed_value),0)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed') AS attributed_value,
            (SELECT COUNT(DISTINCT a.order_id)::int FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' AND a.order_id IS NOT NULL) AS attributed_order_count,
            (SELECT COALESCE(json_agg(json_build_object('actionType', x.action_type, 'count', x.action_count, 'value', x.attributed_value) ORDER BY x.action_count DESC), '[]'::json) FROM (SELECT ca.action_type, COUNT(*)::int AS action_count, COALESCE(SUM(a.attributed_value),0)::int AS attributed_value FROM marketing_attributions a JOIN marketing_customer_actions ca ON ca.id = a.customer_action_id AND ca.user_id = a.user_id WHERE a.user_id = c.user_id AND a.campaign_id = c.id AND ca.status = 'completed' GROUP BY ca.action_type) x) AS attributed_action_breakdown
       FROM marketing_campaigns c
       LEFT JOIN marketing_campaign_products cp ON cp.campaign_id = c.id
       LEFT JOIN marketing_campaign_posts cpo ON cpo.campaign_id = c.id
       LEFT JOIN marketing_content_items ci ON ci.campaign_id = c.id
      WHERE c.user_id = $1 AND c.id = $2
      GROUP BY c.id`,
    [userId, campaignId],
  );

  if (!result.rows[0]) return null;
  const campaign = mapCampaign(result.rows[0]);
  const evidence = await listCompletedExperimentEvidence(userId);
  return { ...campaign, experimentLearning: evidence.filter((experiment) => experiment.campaignId === campaign.id).map((experiment) => ({ id: experiment.id, name: experiment.name, metric: experiment.metric, learningSignal: getExperimentLearningSignal(experiment), resultSummary: experiment.resultSummary })) };
}

function mapCampaign(row: any): MarketingCampaign {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    goalId: row.goal_id === null ? null : Number(row.goal_id),
    offerId: row.offer_id === null ? null : Number(row.offer_id),
    name: row.name,
    objective: row.objective,
    audience: row.audience,
    cta: row.cta,
    channelStrategy: row.channel_strategy ?? {},
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    productIds: (row.product_ids ?? []).map(Number),
    postIds: (row.post_ids ?? []).map(Number),
    contentItemCounts: {
      draft: Number(row.content_draft_count ?? 0),
      planned: Number(row.content_planned_count ?? 0),
      ready: Number(row.content_ready_count ?? 0),
      converted: Number(row.content_converted_count ?? 0),
      archived: Number(row.content_archived_count ?? 0),
    },
    contentReadiness: {
      total: Number(row.content_total_count ?? 0),
      needsApproval: Number(row.content_needs_approval_count ?? 0),
      readyToSchedule: Number(row.content_ready_count ?? 0),
      converted: Number(row.content_converted_count ?? 0),
    },
    experimentSummary: {
      total: Number(row.experiment_total_count ?? 0),
      running: Number(row.experiment_running_count ?? 0),
      completed: Number(row.experiment_completed_count ?? 0),
      planned: Number(row.experiment_planned_count ?? 0),
    },
    observedImpact: {
      actionCount: Number(row.observed_action_count ?? 0),
      actionValue: Number(row.observed_action_value ?? 0),
      linkedOrderCount: Number(row.linked_order_count ?? 0),
      linkedOrderValue: Number(row.linked_order_value ?? 0),
      actionBreakdown: Array.isArray(row.observed_action_breakdown) ? row.observed_action_breakdown.map((item: any) => ({ actionType: item.actionType, count: Number(item.count), value: Number(item.value) })) : [],
      attributedActionCount: Number(row.attributed_action_count ?? 0),
      attributedValue: Number(row.attributed_value ?? 0),
      attributedOrderCount: Number(row.attributed_order_count ?? 0),
      attributedActionBreakdown: Array.isArray(row.attributed_action_breakdown) ? row.attributed_action_breakdown.map((item: any) => ({ actionType: item.actionType, count: Number(item.count), value: Number(item.value) })) : [],
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
