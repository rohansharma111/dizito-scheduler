import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { listMarketingAttributions } from "@/lib/marketing/attributions";

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function positiveId(value: unknown) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const rawCampaignId = new URL(request.url).searchParams.get("campaignId");
  const campaignId = rawCampaignId == null ? undefined : positiveId(rawCampaignId);
  if (campaignId === undefined) return errorResponse("Invalid campaignId");
  try {
    return Response.json({ attributions: await listMarketingAttributions(userId, campaignId ?? undefined) });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to load attributions", 500);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return errorResponse("Invalid user", 401);

  try {
    const body = await request.json();
    const customerActionId = positiveId(body.customerActionId);
    const campaignId = positiveId(body.campaignId);
    const contentItemId = positiveId(body.contentItemId);
    const variantId = positiveId(body.variantId);
    const postId = positiveId(body.postId);
    const orderId = positiveId(body.orderId);
    if (customerActionId === undefined) return errorResponse("Invalid customerActionId");
    if (campaignId === undefined && body.campaignId != null) return errorResponse("Invalid campaignId");
    if (contentItemId === undefined && body.contentItemId != null) return errorResponse("Invalid contentItemId");
    if (variantId === undefined && body.variantId != null) return errorResponse("Invalid variantId");
    if (postId === undefined && body.postId != null) return errorResponse("Invalid postId");
    if (orderId === undefined && body.orderId != null) return errorResponse("Invalid orderId");
    if (campaignId == null && contentItemId == null && variantId == null && postId == null) {
      return errorResponse("Attribution must reference a campaign, content item, variant, or post");
    }

    const actionResult = await pool.query(
      `SELECT id, campaign_id AS "campaignId", content_item_id AS "contentItemId", variant_id AS "variantId", order_id AS "orderId", value, currency
         FROM marketing_customer_actions
        WHERE id=$1 AND user_id=$2`,
      [customerActionId, userId],
    );
    if (actionResult.rowCount === 0) return errorResponse("Customer action not found", 404);
    const action = actionResult.rows[0];

    if (campaignId != null) {
      const result = await pool.query(`SELECT id FROM marketing_campaigns WHERE id=$1 AND user_id=$2`, [campaignId, userId]);
      if (result.rowCount === 0) return errorResponse("Campaign not found", 404);
    }
    if (contentItemId != null) {
      const result = await pool.query(`SELECT id, campaign_id AS "campaignId" FROM marketing_content_items WHERE id=$1 AND user_id=$2`, [contentItemId, userId]);
      if (result.rowCount === 0) return errorResponse("Content item not found", 404);
      if (campaignId != null && Number(result.rows[0].campaignId) !== campaignId) return errorResponse("Content item does not belong to campaign");
    }
    if (variantId != null) {
      const result = await pool.query(`SELECT id, content_item_id AS "contentItemId" FROM marketing_content_item_variants WHERE id=$1 AND user_id=$2`, [variantId, userId]);
      if (result.rowCount === 0) return errorResponse("Content variant not found", 404);
      if (contentItemId != null && Number(result.rows[0].contentItemId) !== contentItemId) return errorResponse("Variant does not belong to content item");
    }
    if (postId != null) {
      const result = await pool.query(`SELECT id FROM posts WHERE id=$1 AND user_id=$2`, [postId, userId]);
      if (result.rowCount === 0) return errorResponse("Post not found", 404);
    }
    if (orderId != null) {
      const result = await pool.query(`SELECT id, total, currency FROM orders WHERE id=$1 AND user_id=$2`, [orderId, userId]);
      if (result.rowCount === 0) return errorResponse("Order not found", 404);
      if (action.orderId != null && Number(action.orderId) !== orderId) return errorResponse("Order does not match customer action");
    }

    if (campaignId != null && action.campaignId != null && Number(action.campaignId) !== campaignId) return errorResponse("Campaign does not match customer action");
    if (contentItemId != null && action.contentItemId != null && Number(action.contentItemId) !== contentItemId) return errorResponse("Content item does not match customer action");
    if (variantId != null && action.variantId != null && Number(action.variantId) !== variantId) return errorResponse("Variant does not match customer action");

    const attributedValue = body.attributedValue == null ? null : Number(body.attributedValue);
    if (attributedValue !== null && (!Number.isInteger(attributedValue) || attributedValue < 0)) return errorResponse("Invalid attributedValue");
    const currency = body.currency == null ? null : String(body.currency).toUpperCase();
    if (currency !== null && !/^[A-Z]{3}$/.test(currency)) return errorResponse("Invalid currency");
    const weight = body.weight == null ? null : Number(body.weight);
    if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1)) return errorResponse("Invalid weight");
    const note = body.note == null ? null : String(body.note).slice(0, 2000);

    const result = await pool.query(
      `INSERT INTO marketing_attributions
        (user_id, customer_action_id, campaign_id, content_item_id, variant_id, post_id, order_id, attribution_model, attributed_value, currency, weight, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, customer_action_id AS "customerActionId", campaign_id AS "campaignId", content_item_id AS "contentItemId", variant_id AS "variantId", post_id AS "postId", order_id AS "orderId", attribution_model AS "attributionModel", attributed_value AS "attributedValue", currency, weight::float AS weight, note, created_at AS "createdAt"`,
      [userId, customerActionId, campaignId ?? null, contentItemId ?? null, variantId ?? null, postId ?? null, orderId ?? null, "manual", attributedValue, currency, weight, note],
    );
    return Response.json({ attribution: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create attribution", 500);
  }
}
