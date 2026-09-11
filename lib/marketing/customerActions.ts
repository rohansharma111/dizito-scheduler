import { pool } from "@/lib/db";

export const CUSTOMER_ACTION_TYPES = ["lead", "booking", "message", "call", "website_visit", "checkout", "order", "purchase"] as const;
export type CustomerActionType = (typeof CUSTOMER_ACTION_TYPES)[number];

export async function listCustomerActions(userId: number, campaignId?: number) {
  const result = await pool.query(
    `SELECT a.id, a.user_id AS "userId", a.action_type AS "actionType", a.status,
            a.campaign_id AS "campaignId", a.content_item_id AS "contentItemId",
            a.variant_id AS "variantId", a.customer_id AS "customerId", a.order_id AS "orderId",
            a.value, a.currency, a.source, a.external_id AS "externalId",
            a.occurred_at AS "occurredAt", a.metadata, a.created_at AS "createdAt"
       FROM marketing_customer_actions a
      WHERE a.user_id = $1
        AND ($2::bigint IS NULL OR a.campaign_id = $2)
      ORDER BY a.occurred_at DESC, a.id DESC
      LIMIT 200`,
    [userId, campaignId ?? null],
  );
  return result.rows;
}

export async function getCustomerActionSummary(userId: number) {
  const result = await pool.query(
    `SELECT action_type AS "actionType", COUNT(*)::int AS count,
            COALESCE(SUM(value),0)::int AS value
       FROM marketing_customer_actions
      WHERE user_id = $1 AND status = 'completed'
      GROUP BY action_type
      ORDER BY count DESC`,
    [userId],
  );
  return result.rows;
}
