import { pool } from "@/lib/db";

export type MarketingContentItem = {
  id: number;
  userId: number;
  campaignId: number;
  campaignName: string | null;
  campaignObjective: string | null;
  campaignAudience: string | null;
  campaignCta: string | null;
  offerId: number | null;
  offerName: string | null;
  productNames: string[];
  contentType: string;
  format: string | null;
  topic: string | null;
  angle: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  channelStrategy: Record<string, unknown>;
  mediaId: number | null;
  status: string;
  plannedFor: string | null;
  productIds: number[];
  postIds: number[];
  createdAt: string;
  updatedAt: string;
};

function mapContentItem(row: any): MarketingContentItem {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    campaignId: Number(row.campaign_id),
    campaignName: row.campaign_name ?? null,
    campaignObjective: row.campaign_objective ?? null,
    campaignAudience: row.campaign_audience ?? null,
    campaignCta: row.campaign_cta ?? null,
    offerId: row.offer_id === null ? null : Number(row.offer_id),
    offerName: row.offer_name ?? null,
    productNames: (row.product_names ?? []).filter(Boolean),
    contentType: row.content_type,
    format: row.format,
    topic: row.topic,
    angle: row.angle,
    hook: row.hook,
    body: row.body,
    cta: row.cta,
    channelStrategy: row.channel_strategy ?? {},
    mediaId: row.media_id === null ? null : Number(row.media_id),
    status: row.status,
    plannedFor: row.planned_for,
    productIds: (row.product_ids ?? []).map(Number),
    postIds: (row.post_ids ?? []).map(Number),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listContentItems(userId: number, campaignId?: number) {
  const params: unknown[] = [userId];
  let campaignFilter = "";

  if (campaignId !== undefined) {
    params.push(campaignId);
    campaignFilter = "AND ci.campaign_id = $2";
  }

  const result = await pool.query(
    `
      SELECT
        ci.*,
        c.name AS campaign_name,
        c.objective AS campaign_objective,
        c.audience AS campaign_audience,
        c.cta AS campaign_cta,
        c.offer_id,
        o.name AS offer_name,
        COALESCE(
          ARRAY_AGG(DISTINCT cip.product_id) FILTER (WHERE cip.product_id IS NOT NULL),
          '{}'
        ) AS product_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          '{}'
        ) AS product_names,
        COALESCE(
          ARRAY_AGG(DISTINCT cipost.post_id) FILTER (WHERE cipost.post_id IS NOT NULL),
          '{}'
        ) AS post_ids
      FROM marketing_content_items ci
      JOIN marketing_campaigns c ON c.id = ci.campaign_id AND c.user_id = ci.user_id
      LEFT JOIN marketing_offers o ON o.id = c.offer_id AND o.user_id = ci.user_id
      LEFT JOIN marketing_content_item_products cip
        ON cip.content_item_id = ci.id
      LEFT JOIN products p ON p.id = cip.product_id AND p.user_id = ci.user_id
      LEFT JOIN marketing_content_item_posts cipost
        ON cipost.content_item_id = ci.id
      WHERE ci.user_id = $1
      ${campaignFilter}
      GROUP BY ci.id
      ORDER BY ci.planned_for NULLS LAST, ci.id DESC
    `,
    params,
  );

  return result.rows.map(mapContentItem);
}

export async function getContentItem(userId: number, contentItemId: number) {
  const result = await pool.query(
    `
      SELECT
        ci.*,
        c.name AS campaign_name,
        c.objective AS campaign_objective,
        c.audience AS campaign_audience,
        c.cta AS campaign_cta,
        COALESCE(
          ARRAY_AGG(DISTINCT cip.product_id) FILTER (WHERE cip.product_id IS NOT NULL),
          '{}'
        ) AS product_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT cipost.post_id) FILTER (WHERE cipost.post_id IS NOT NULL),
          '{}'
        ) AS post_ids
      FROM marketing_content_items ci
      JOIN marketing_campaigns c ON c.id = ci.campaign_id AND c.user_id = ci.user_id
      LEFT JOIN marketing_content_item_products cip
        ON cip.content_item_id = ci.id
      LEFT JOIN marketing_content_item_posts cipost
        ON cipost.content_item_id = ci.id
      WHERE ci.id = $1
        AND ci.user_id = $2
      GROUP BY ci.id
    `,
    [contentItemId, userId],
  );

  return result.rows[0] ? mapContentItem(result.rows[0]) : null;
}
