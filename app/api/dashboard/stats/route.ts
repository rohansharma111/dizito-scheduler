import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const userId = (session.user as any).id;

  const postsResult = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'scheduled'
        ) AS scheduled,

        COUNT(*) FILTER (
          WHERE status = 'published'
        ) AS published,

        COUNT(*) FILTER (
          WHERE status = 'failed'
        ) AS failed,

      COUNT(*) FILTER (
          WHERE status = 'draft'
        ) AS draft
      FROM posts
      WHERE user_id = $1
      `,
    [userId],
  );

  const accountsResult = await pool.query(
    `
      SELECT COUNT(*) AS accounts
      FROM social_accounts
      WHERE user_id = $1
      `,
    [userId],
  );

  return Response.json({
    scheduled: Number(postsResult.rows[0].scheduled),

    published: Number(postsResult.rows[0].published),

    failed: Number(postsResult.rows[0].failed),

    accounts: Number(accountsResult.rows[0].accounts),

    drafts: Number(accountsResult.rows[0].draft),
  });
}
