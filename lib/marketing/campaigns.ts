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
            COUNT(ci.id) FILTER (WHERE ci.status = 'draft')::int AS content_draft_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'planned')::int AS content_planned_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'ready')::int AS content_ready_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'converted')::int AS content_converted_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'archived')::int AS content_archived_count
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
            COALESCE(array_agg(DISTINCT cpo.post_id) FILTER (WHERE cpo.post_id IS NOT NULL), '{}') AS post_ids,
            COUNT(ci.id) FILTER (WHERE ci.status = 'draft')::int AS content_draft_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'planned')::int AS content_planned_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'ready')::int AS content_ready_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'converted')::int AS content_converted_count,
            COUNT(ci.id) FILTER (WHERE ci.status = 'archived')::int AS content_archived_count
       FROM marketing_campaigns c
       LEFT JOIN marketing_campaign_products cp ON cp.campaign_id = c.id
       LEFT JOIN marketing_campaign_posts cpo ON cpo.campaign_id = c.id
       LEFT JOIN marketing_content_items ci ON ci.campaign_id = c.id
      WHERE c.user_id = $1 AND c.id = $2
      GROUP BY c.id`,
    [userId, campaignId],
  );

  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
