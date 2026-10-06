import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
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
  const postId = Number(body.postId);
  const variantId = body.variantId == null ? null : Number(body.variantId);
  if (!Number.isInteger(postId) || postId <= 0) return jsonError("Invalid postId");
  if (variantId !== null && (!Number.isInteger(variantId) || variantId <= 0)) return jsonError("Invalid variantId");

  const userId = Number((session.user as any).id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const contentItem = await client.query(
      `SELECT id FROM marketing_content_items WHERE id = $1 AND user_id = $2`,
      [contentItemId, userId],
    );
    if (contentItem.rowCount === 0) {
      await client.query("ROLLBACK");
      return jsonError("Content item not found", 404);
    }

    const post = await client.query(
      `SELECT id FROM posts WHERE id = $1 AND user_id = $2`,
      [postId, userId],
    );
    if (post.rowCount === 0) {
      await client.query("ROLLBACK");
      return jsonError("Post not found", 404);
    }

    if (variantId !== null) {
      const variant = await client.query(
        `SELECT id, platform
           FROM marketing_content_item_variants
          WHERE id = $1 AND content_item_id = $2 AND user_id = $3`,
        [variantId, contentItemId, userId],
      );
      if (variant.rowCount === 0) {
        await client.query("ROLLBACK");
        return jsonError("Content variant not found", 404);
      }

      const target = await client.query(
        `SELECT 1
           FROM post_targets
          WHERE post_id = $1 AND platform = $2
          LIMIT 1`,
        [postId, variant.rows[0].platform],
      );
      if (target.rowCount === 0) {
        await client.query("ROLLBACK");
        return jsonError("Post is not targeted to the variant platform");
      }
    }

    await client.query(
      `
        INSERT INTO marketing_content_item_posts (content_item_id, post_id, variant_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (content_item_id, post_id)
        DO UPDATE SET variant_id = COALESCE(marketing_content_item_posts.variant_id, EXCLUDED.variant_id)
      `,
      [contentItemId, postId, variantId],
    );

    await client.query(
      `UPDATE marketing_content_items SET status = 'converted', updated_at = now() WHERE id = $1 AND user_id = $2`,
      [contentItemId, userId],
    );

    await client.query("COMMIT");
    return Response.json({ success: true, contentItemId, postId, variantId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return jsonError("Failed to link post", 500);
  } finally {
    client.release();
  }
}
