import { pool } from "@/lib/db";

export type BusinessImpact = {
  actionSummary: Array<{ actionType: string; count: number; value: number }>;
  attributedSummary: Array<{ campaignId: number | null; campaignName: string | null; actionType: string; count: number; value: number }>;
  revenueSummary: { linkedOrderCount: number; purchaseValue: number };
};

export async function getBusinessImpact(userId: number): Promise<BusinessImpact> {
  const [actions, attributed, revenue] = await Promise.all([
    pool.query(`SELECT action_type AS "actionType", COUNT(*)::int AS count, COALESCE(SUM(value),0)::int AS value FROM marketing_customer_actions WHERE user_id=$1 AND status='completed' GROUP BY action_type ORDER BY count DESC`, [userId]),
    pool.query(`SELECT a.campaign_id AS "campaignId", c.name AS "campaignName", a.action_type AS "actionType", COUNT(*)::int AS count, COALESCE(SUM(a.value),0)::int AS value FROM marketing_customer_actions a LEFT JOIN marketing_campaigns c ON c.id=a.campaign_id AND c.user_id=a.user_id WHERE a.user_id=$1 AND a.status='completed' AND a.campaign_id IS NOT NULL GROUP BY a.campaign_id,c.name,a.action_type ORDER BY count DESC`, [userId]),
    pool.query(`SELECT COUNT(DISTINCT order_id)::int AS "linkedOrderCount", COALESCE(SUM(value),0)::int AS "purchaseValue" FROM marketing_customer_actions WHERE user_id=$1 AND status='completed' AND order_id IS NOT NULL AND action_type IN ('order','purchase')`, [userId]),
  ]);
  return { actionSummary: actions.rows, attributedSummary: attributed.rows, revenueSummary: revenue.rows[0] };
}
