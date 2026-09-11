import { pool } from "@/lib/db";

export type MarketingAttribution = {
  id: number;
  customerActionId: number;
  campaignId: number | null;
  contentItemId: number | null;
  variantId: number | null;
  postId: number | null;
  orderId: number | null;
  attributionModel: "manual";
  attributedValue: number | null;
  currency: string | null;
  weight: number | null;
  note: string | null;
  createdAt: string;
};

export async function listMarketingAttributions(userId: number, campaignId?: number): Promise<MarketingAttribution[]> {
  const params: unknown[] = [userId];
  let where = "a.user_id = $1";
  if (campaignId !== undefined) {
    params.push(campaignId);
    where += " AND a.campaign_id = $2";
  }
  const result = await pool.query(
    `SELECT a.id,
            a.customer_action_id AS "customerActionId",
            a.campaign_id AS "campaignId",
            a.content_item_id AS "contentItemId",
            a.variant_id AS "variantId",
            a.post_id AS "postId",
            a.order_id AS "orderId",
            a.attribution_model AS "attributionModel",
            a.attributed_value AS "attributedValue",
            a.currency,
            a.weight::float AS weight,
            a.note,
            a.created_at AS "createdAt"
       FROM marketing_attributions a
      WHERE ${where}
      ORDER BY a.created_at DESC, a.id DESC`,
    params,
  );
  return result.rows;
}

export async function getMarketingAttributionSummary(userId: number) {
  const result = await pool.query(
    `SELECT a.campaign_id AS "campaignId",
            c.name AS "campaignName",
            COUNT(*)::int AS count,
            COUNT(a.order_id)::int AS "linkedOrderCount",
            COALESCE(SUM(a.attributed_value), 0)::int AS "attributedValue"
       FROM marketing_attributions a
       LEFT JOIN marketing_campaigns c ON c.id = a.campaign_id AND c.user_id = a.user_id
      WHERE a.user_id = $1
      GROUP BY a.campaign_id, c.name
      ORDER BY count DESC, a.campaign_id NULLS LAST`,
    [userId],
  );
  return result.rows;
}
