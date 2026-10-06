import { pool } from "@/lib/db";

export type BusinessImpact = {
  actionSummary: Array<{ actionType: string; count: number; value: number }>;
  observedCampaignSummary: Array<{ campaignId: number | null; campaignName: string | null; actionType: string; count: number; value: number }>;
  observedContentSummary: Array<{ contentItemId: number | null; contentTopic: string | null; actionType: string; count: number; value: number }>;
  observedVariantSummary: Array<{ variantId: number | null; contentItemId: number | null; platform: string | null; actionType: string; count: number; value: number }>;
  attributionSummary: Array<{ campaignId: number | null; campaignName: string | null; actionType: string; count: number; attributedValue: number }>;
  revenueSummary: {
    observedLinkedOrderCount: number;
    observedPurchaseValue: number;
    attributedOrderCount: number;
    attributedValue: number;
  };
};

export async function getBusinessImpact(userId: number): Promise<BusinessImpact> {
  const [actions, observedCampaigns, observedContent, observedVariants, observedRevenue, attributions, attributedRevenue] = await Promise.all([
    pool.query(
      `SELECT action_type AS "actionType", COUNT(*)::int AS count, COALESCE(SUM(value),0)::int AS value
         FROM marketing_customer_actions
        WHERE user_id=$1 AND status='completed'
        GROUP BY action_type
        ORDER BY count DESC`,
      [userId],
    ),
    pool.query(
      `SELECT a.campaign_id AS "campaignId", c.name AS "campaignName", a.action_type AS "actionType",
              COUNT(*)::int AS count, COALESCE(SUM(a.value),0)::int AS value
         FROM marketing_customer_actions a
         LEFT JOIN marketing_campaigns c ON c.id=a.campaign_id AND c.user_id=a.user_id
        WHERE a.user_id=$1 AND a.status='completed' AND a.campaign_id IS NOT NULL
        GROUP BY a.campaign_id,c.name,a.action_type
        ORDER BY count DESC`,
      [userId],
    ),
    pool.query(
      `SELECT a.content_item_id AS "contentItemId", ci.topic AS "contentTopic", a.action_type AS "actionType",
              COUNT(*)::int AS count, COALESCE(SUM(a.value),0)::int AS value
         FROM marketing_customer_actions a
         LEFT JOIN marketing_content_items ci ON ci.id=a.content_item_id AND ci.user_id=a.user_id
        WHERE a.user_id=$1 AND a.status='completed' AND a.content_item_id IS NOT NULL
        GROUP BY a.content_item_id,ci.topic,a.action_type
        ORDER BY count DESC
        LIMIT 100`,
      [userId],
    ),
    pool.query(
      `SELECT a.variant_id AS "variantId", a.content_item_id AS "contentItemId", v.platform,
              a.action_type AS "actionType", COUNT(*)::int AS count, COALESCE(SUM(a.value),0)::int AS value
         FROM marketing_customer_actions a
         LEFT JOIN marketing_content_item_variants v ON v.id=a.variant_id AND v.user_id=a.user_id
        WHERE a.user_id=$1 AND a.status='completed' AND a.variant_id IS NOT NULL
        GROUP BY a.variant_id,a.content_item_id,v.platform,a.action_type
        ORDER BY count DESC
        LIMIT 100`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT order_id)::int AS "observedLinkedOrderCount",
              COALESCE(SUM(value),0)::int AS "observedPurchaseValue"
         FROM marketing_customer_actions
        WHERE user_id=$1 AND status='completed' AND order_id IS NOT NULL AND action_type IN ('order','purchase')`,
      [userId],
    ),
    pool.query(
      `SELECT a.campaign_id AS "campaignId", c.name AS "campaignName", ca.action_type AS "actionType",
              COUNT(*)::int AS count, COALESCE(SUM(a.attributed_value),0)::int AS "attributedValue"
         FROM marketing_attributions a
         JOIN marketing_customer_actions ca ON ca.id=a.customer_action_id AND ca.user_id=a.user_id
         LEFT JOIN marketing_campaigns c ON c.id=a.campaign_id AND c.user_id=a.user_id
        WHERE a.user_id=$1 AND ca.status='completed'
        GROUP BY a.campaign_id,c.name,ca.action_type
        ORDER BY count DESC`,
      [userId],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT a.order_id)::int AS "attributedOrderCount",
              COALESCE(SUM(a.attributed_value),0)::int AS "attributedValue"
         FROM marketing_attributions a
         JOIN marketing_customer_actions ca ON ca.id=a.customer_action_id AND ca.user_id=a.user_id
        WHERE a.user_id=$1 AND ca.status='completed' AND a.order_id IS NOT NULL`,
      [userId],
    ),
  ]);

  return {
    actionSummary: actions.rows,
    observedCampaignSummary: observedCampaigns.rows,
    observedContentSummary: observedContent.rows,
    observedVariantSummary: observedVariants.rows,
    attributionSummary: attributions.rows,
    revenueSummary: { ...observedRevenue.rows[0], ...attributedRevenue.rows[0] },
  };
}
