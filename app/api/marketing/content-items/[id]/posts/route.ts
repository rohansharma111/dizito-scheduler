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
  if (!Number.isInteger(postId) || postId <= 0) return jsonError("Invalid postId");

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

    await client.query(
      `
        INSERT INTO marketing_content_item_posts (content_item_id, post_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [contentItemId, postId],
    );

    await client.query(
      `UPDATE marketing_content_items SET status = 'converted', updated_at = now() WHERE id = $1 AND user_id = $2`,
      [contentItemId, userId],
    );

    await client.query("COMMIT");
    return Response.json({ success: true, contentItemId, postId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return jsonError("Failed to link post", 500);
  } finally {
    client.release();
  }
}
