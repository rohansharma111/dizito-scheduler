import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { CUSTOMER_ACTION_TYPES, listCustomerActions } from "@/lib/marketing/customerActions";

function errorResponse(error: string, status = 400) { return Response.json({ error }, { status }); }

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const rawCampaignId = new URL(request.url).searchParams.get("campaignId");
  const campaignId = rawCampaignId == null ? undefined : Number(rawCampaignId);
  if (campaignId !== undefined && (!Number.isInteger(campaignId) || campaignId <= 0)) return errorResponse("Invalid campaignId");
  try { return Response.json({ actions: await listCustomerActions(userId, campaignId) }); }
  catch (error) { console.error(error); return errorResponse("Failed to load customer actions", 500); }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return errorResponse("Invalid user", 401);

  try {
    const body = await request.json();
    const actionType = String(body.actionType || "");
    if (!(CUSTOMER_ACTION_TYPES as readonly string[]).includes(actionType)) return errorResponse("Invalid actionType");
    const status = body.status == null ? "completed" : String(body.status);
    if (!["pending", "completed", "cancelled"].includes(status)) return errorResponse("Invalid status");

    const campaignId = body.campaignId == null ? null : Number(body.campaignId);
    const contentItemId = body.contentItemId == null ? null : Number(body.contentItemId);
    const variantId = body.variantId == null ? null : Number(body.variantId);
    const customerId = body.customerId == null ? null : Number(body.customerId);
    const orderId = body.orderId == null ? null : Number(body.orderId);
    for (const [name, value] of [["campaignId", campaignId], ["contentItemId", contentItemId], ["variantId", variantId], ["customerId", customerId], ["orderId", orderId]] as const) {
      if (value !== null && (!Number.isInteger(value) || value <= 0)) return errorResponse(`Invalid ${name}`);
    }

    if (campaignId !== null) {
      const row = await pool.query(`SELECT id FROM marketing_campaigns WHERE id=$1 AND user_id=$2`, [campaignId, userId]);
      if (row.rowCount === 0) return errorResponse("Campaign not found", 404);
    }
    if (contentItemId !== null) {
      const row = await pool.query(`SELECT id, campaign_id FROM marketing_content_items WHERE id=$1 AND user_id=$2`, [contentItemId, userId]);
      if (row.rowCount === 0) return errorResponse("Content item not found", 404);
      if (campaignId !== null && Number(row.rows[0].campaign_id) !== campaignId) return errorResponse("Content item does not belong to campaign");
    }
    if (variantId !== null) {
      const row = await pool.query(`SELECT v.id, v.content_item_id FROM marketing_content_item_variants v WHERE v.id=$1 AND v.user_id=$2`, [variantId, userId]);
      if (row.rowCount === 0) return errorResponse("Content variant not found", 404);
      if (contentItemId !== null && Number(row.rows[0].content_item_id) !== contentItemId) return errorResponse("Variant does not belong to content item");
    }
    if (customerId !== null) {
      const row = await pool.query(`SELECT id FROM customers WHERE id=$1 AND user_id=$2`, [customerId, userId]);
      if (row.rowCount === 0) return errorResponse("Customer not found", 404);
    }

    const value = body.value == null ? null : Number(body.value);
    if (value !== null && (!Number.isInteger(value) || value < 0)) return errorResponse("Invalid value");
    const currency = body.currency == null ? null : String(body.currency).toUpperCase();
    if (currency !== null && !/^[A-Z]{3}$/.test(currency)) return errorResponse("Invalid currency");
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    const source = body.source == null ? null : String(body.source).slice(0, 50);
    const externalId = body.externalId == null ? null : String(body.externalId);
    const occurredAt = body.occurredAt == null ? null : new Date(String(body.occurredAt));
    if (occurredAt !== null && Number.isNaN(occurredAt.getTime())) return errorResponse("Invalid occurredAt");

    const result = await pool.query(
      `INSERT INTO marketing_customer_actions
        (user_id, action_type, status, campaign_id, content_item_id, variant_id, customer_id, order_id, value, currency, source, external_id, occurred_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamptz,now()),$14)
       ON CONFLICT (user_id, source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL DO UPDATE SET
         action_type=EXCLUDED.action_type, status=EXCLUDED.status, campaign_id=EXCLUDED.campaign_id,
         content_item_id=EXCLUDED.content_item_id, variant_id=EXCLUDED.variant_id, customer_id=EXCLUDED.customer_id,
         order_id=EXCLUDED.order_id, value=EXCLUDED.value, currency=EXCLUDED.currency,
         occurred_at=EXCLUDED.occurred_at, metadata=EXCLUDED.metadata
       RETURNING id, action_type AS "actionType", status, campaign_id AS "campaignId", content_item_id AS "contentItemId", variant_id AS "variantId", customer_id AS "customerId", order_id AS "orderId", value, currency, source, external_id AS "externalId", occurred_at AS "occurredAt", metadata`,
      [userId, actionType, status, campaignId, contentItemId, variantId, customerId, orderId, value, currency, source, externalId, occurredAt?.toISOString() ?? null, metadata],
    );
    return Response.json({ action: result.rows[0] }, { status: 201 });
  } catch (error) { console.error(error); return errorResponse("Failed to record customer action", 500); }
}
