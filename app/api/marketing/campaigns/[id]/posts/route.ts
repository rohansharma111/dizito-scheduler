import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getCampaign } from "@/lib/marketing/campaigns";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaignId = Number(id);
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(campaignId)) return Response.json({ error: "Invalid campaign id" }, { status: 400 });

  const campaign = await getCampaign(userId, campaignId);
  if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });

  const body = await request.json();
  const postId = Number(body.postId);
  if (!Number.isInteger(postId)) return Response.json({ error: "Invalid post id" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const post = await client.query(`SELECT id FROM posts WHERE id = $1 AND user_id = $2 FOR SHARE`, [postId, userId]);
    if (!post.rows[0]) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Post not found" }, { status: 404 });
    }
    await client.query(
      `INSERT INTO marketing_campaign_posts (campaign_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [campaignId, postId],
    );
    await client.query("COMMIT");
    return Response.json({ linked: true }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return Response.json({ error: "Failed to link post to campaign" }, { status: 500 });
  } finally {
    client.release();
  }
}
