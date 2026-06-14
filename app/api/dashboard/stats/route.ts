import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {

  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user) {

    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );

  }

  const userId =
    (session.user as any).id;

  const scheduled =
    await pool.query(
      `
      SELECT COUNT(*)
      FROM posts
      WHERE
        user_id = $1
        AND status = 'scheduled'
      `,
      [userId]
    );

  const published =
    await pool.query(
      `
      SELECT COUNT(*)
      FROM posts
      WHERE
        user_id = $1
        AND status = 'published'
      `,
      [userId]
    );

  const failed =
    await pool.query(
      `
      SELECT COUNT(*)
      FROM posts
      WHERE
        user_id = $1
        AND status = 'failed'
      `,
      [userId]
    );

  const accounts =
    await pool.query(
      `
      SELECT COUNT(*)
      FROM social_accounts
      WHERE user_id = $1
      `,
      [userId]
    );

  return Response.json({
    scheduled:
      Number(
        scheduled.rows[0].count
      ),
    published:
      Number(
        published.rows[0].count
      ),
    failed:
      Number(
        failed.rows[0].count
      ),
    accounts:
      Number(
        accounts.rows[0].count
      ),
  });

}