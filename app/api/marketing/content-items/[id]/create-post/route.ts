import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { getPlan, canCreatePost } from "@/lib/plans";
import { getCurrentUsage } from "@/lib/usage/getCurrentUsage";
import { incrementPostsCreated } from "@/lib/usage/incrementPostsCreated";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function buildPostCopy(item: any) {
  const parts = [item.hook, item.body, item.topic ? `Topic: ${item.topic}` : null, item.cta].filter(Boolean);
  return parts.join("\n\n").trim();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return jsonError("Invalid id");

  const body = await request.json();
  const selectedAccounts = Array.isArray(body.selectedAccounts)
    ? [...new Set(body.selectedAccounts.map(Number))]
    : [];
  const scheduleTime = body.scheduleTime;
  if (selectedAccounts.length === 0) return jsonError("Select at least one social account");
  if (typeof scheduleTime !== "string" || !scheduleTime) return jsonError("Schedule time is required");

  const userId = Number((session.user as any).id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `SELECT ci.*, c.id AS campaign_id
         FROM marketing_content_items ci
         JOIN marketing_campaigns c ON c.id = ci.campaign_id AND c.user_id = ci.user_id
        WHERE ci.id = $1 AND ci.user_id = $2
        FOR SHARE`,
      [contentItemId, userId],
    );
    const item = itemResult.rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return jsonError("Content item not found", 404);
    }

    if (item.status === "converted") {
      await client.query("ROLLBACK");
      return jsonError("Content item has already been converted", 409);
    }

    const accounts = await client.query(
      `SELECT id, platform FROM social_accounts WHERE id = ANY($1) AND user_id = $2`,
      [selectedAccounts, userId],
    );
    if (accounts.rows.length !== selectedAccounts.length) {
      await client.query("ROLLBACK");
      return jsonError("Invalid account selection");
    }

    if (item.media_id !== null) {
      const media = await client.query(
        `SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [item.media_id, userId],
      );
      if (media.rowCount === 0) {
        await client.query("ROLLBACK");
        return jsonError("Content item's media is no longer available", 409);
      }
    }

    const userResult = await client.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
    const userPlan = userResult.rows[0]?.plan || "free";
    const usage = await getCurrentUsage(userId);
    const plan = getPlan(userPlan);
    if (!canCreatePost(userPlan, Number(usage.posts_created))) {
      await client.query("ROLLBACK");
      return jsonError(`Your ${plan.name} plan has reached its monthly post limit.`, 403);
    }

    const copy = buildPostCopy(item);
    if (!copy) {
      await client.query("ROLLBACK");
      return jsonError("Content item needs copy, a hook, a topic, or a CTA before it can become a post");
    }

    const postResult = await client.query(
      `INSERT INTO posts (post, schedule_time, status, media_id, user_id)
       VALUES ($1,$2,'scheduled',$3,$4)
       RETURNING *`,
      [copy, scheduleTime, item.media_id, userId],
    );
    const post = postResult.rows[0];

    for (const account of accounts.rows) {
      await client.query(
        `INSERT INTO post_targets (post_id, social_account_id, platform, status)
         VALUES ($1,$2,$3,'scheduled')`,
        [post.id, account.id, account.platform],
      );
    }

    await client.query(
      `INSERT INTO marketing_content_item_posts (content_item_id, post_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [contentItemId, post.id],
    );
    await client.query(
      `INSERT INTO marketing_campaign_posts (campaign_id, post_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [item.campaign_id, post.id],
    );
    await client.query(
      `UPDATE marketing_content_items SET status='converted', updated_at=now() WHERE id=$1 AND user_id=$2`,
      [contentItemId, userId],
    );

    await client.query("COMMIT");
    await incrementPostsCreated(userId);
    await createEvent("POST_CREATED_FROM_CONTENT_ITEM", "post", Number(post.id), userId, {
      contentItemId,
      campaignId: Number(item.campaign_id),
      targets: accounts.rows.length,
    });

    return Response.json({ success: true, post, contentItemId, campaignId: Number(item.campaign_id) }, { status: 201 });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error(error);
    return jsonError("Failed to create post from content item", 500);
  } finally {
    client.release();
  }
}
