import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { getPlan, canCreatePost } from "@/lib/plans";
import { getCurrentUsage } from "@/lib/usage/getCurrentUsage";
import { incrementPostsCreated } from "@/lib/usage/incrementPostsCreated";

function jsonError(error: string, status = 400) { return Response.json({ error }, { status }); }
function buildPostCopy(item: any) { return [item.hook, item.body, item.topic ? `Topic: ${item.topic}` : null, item.cta].filter(Boolean).join("\n\n").trim(); }

type ContentVariant = {
  id: number;
  platform: string;
  hook: string | null;
  body: string | null;
  cta: string | null;
  media_id: number | null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return jsonError("Invalid id");

  const body = await request.json();
  const selectedAccounts = Array.isArray(body.selectedAccounts) ? [...new Set(body.selectedAccounts.map(Number))] : [];
  const scheduleTime = body.scheduleTime;
  const variantId = body.variantId == null ? null : Number(body.variantId);
  if (selectedAccounts.length === 0) return jsonError("Select at least one social account");
  if (typeof scheduleTime !== "string" || !scheduleTime) return jsonError("Schedule time is required");
  if (variantId !== null && (!Number.isInteger(variantId) || variantId <= 0)) return jsonError("Invalid variant id");

  const userId = Number((session.user as any).id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const itemResult = await client.query(
      `SELECT ci.*, c.id AS campaign_id FROM marketing_content_items ci
       JOIN marketing_campaigns c ON c.id = ci.campaign_id AND c.user_id = ci.user_id
       WHERE ci.id = $1 AND ci.user_id = $2 FOR UPDATE`, [contentItemId, userId]);
    const item = itemResult.rows[0];
    if (!item) { await client.query("ROLLBACK"); return jsonError("Content item not found", 404); }
    if (item.status === "converted") {
      await client.query("ROLLBACK");
      return jsonError("Content item has already been converted", 409);
    }

    const accounts = await client.query(`SELECT id, platform FROM social_accounts WHERE id = ANY($1) AND user_id = $2`, [selectedAccounts, userId]);
    if (accounts.rows.length !== selectedAccounts.length) { await client.query("ROLLBACK"); return jsonError("Invalid account selection"); }

    let copyItem = item;
    let variant: ContentVariant | null = null;
    if (variantId !== null) {
      const variantResult = await client.query<ContentVariant>(
        `SELECT id, platform, hook, body, cta, media_id FROM marketing_content_item_variants
         WHERE id = $1 AND content_item_id = $2 AND user_id = $3 AND status IN ('draft','ready') FOR UPDATE`,
        [variantId, contentItemId, userId]);
      variant = variantResult.rows[0] ?? null;
      if (!variant) { await client.query("ROLLBACK"); return jsonError("Content variant not found", 404); }
      if (accounts.rows.some((account: any) => account.platform !== variant!.platform)) {
        await client.query("ROLLBACK");
        return jsonError("A channel-specific variant can only be published to accounts on the same platform");
      }
      copyItem = { ...item, hook: variant.hook, body: variant.body, cta: variant.cta, media_id: variant.media_id };
    }

    if (copyItem.media_id !== null) {
      const media = await client.query(`SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [copyItem.media_id, userId]);
      if (media.rowCount === 0) { await client.query("ROLLBACK"); return jsonError("Content item's media is no longer available", 409); }
    }

    const userResult = await client.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
    const userPlan = userResult.rows[0]?.plan || "free";
    const usage = await getCurrentUsage(userId);
    const plan = getPlan(userPlan);
    if (!canCreatePost(userPlan, Number(usage.posts_created))) { await client.query("ROLLBACK"); return jsonError(`Your ${plan.name} plan has reached its monthly post limit.`, 403); }

    const copy = buildPostCopy(copyItem);
    if (!copy) { await client.query("ROLLBACK"); return jsonError("Content item needs copy, a hook, a topic, or a CTA before it can become a post"); }

    const postResult = await client.query(
      `INSERT INTO posts (post, schedule_time, status, media_id, user_id) VALUES ($1,$2,'scheduled',$3,$4) RETURNING *`,
      [copy, scheduleTime, copyItem.media_id, userId]);
    const post = postResult.rows[0];
    for (const account of accounts.rows) {
      await client.query(`INSERT INTO post_targets (post_id, social_account_id, platform, status) VALUES ($1,$2,$3,'scheduled')`, [post.id, account.id, account.platform]);
    }
    await client.query(`INSERT INTO marketing_content_item_posts (content_item_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [contentItemId, post.id]);
    await client.query(`INSERT INTO marketing_campaign_posts (campaign_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [item.campaign_id, post.id]);
    await client.query(`UPDATE marketing_content_items SET status='converted', updated_at=now() WHERE id=$1 AND user_id=$2`, [contentItemId, userId]);
    if (variant) await client.query(`UPDATE marketing_content_item_variants SET status='converted', updated_at=now() WHERE id=$1 AND user_id=$2`, [variant.id, userId]);

    await client.query("COMMIT");
    await incrementPostsCreated(userId);
    await createEvent("POST_CREATED_FROM_CONTENT_ITEM", "post", Number(post.id), userId, { contentItemId, campaignId: Number(item.campaign_id), variantId: variant ? Number(variant.id) : null, platform: variant?.platform || null, targets: accounts.rows.length });
    return Response.json({ success: true, post, contentItemId, campaignId: Number(item.campaign_id), variantId: variant ? Number(variant.id) : null }, { status: 201 });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error(error);
    return jsonError("Failed to create post from content item", 500);
  } finally { client.release(); }
}
