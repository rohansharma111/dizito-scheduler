import { pool } from "../../../../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

  const { id } = await params;

  const result = await pool.query(
    `
      SELECT
        pt.id,
        pt.post_id,
        pt.social_account_id,
        pt.platform,
        pt.status,

        pt.retry_count,
        pt.manual_retry_count,

        pt.next_retry_at,

        pt.publish_message,

        pt.processing_started_at,

        pt.published_at,

        pt.created_at,

        sa.account_name

      FROM post_targets pt

      LEFT JOIN social_accounts sa
        ON sa.id =
           pt.social_account_id

      INNER JOIN posts p
        ON p.id =
           pt.post_id

      WHERE
        pt.post_id = $1
        AND p.user_id = $2
        AND sa.id IS NOT NULL

      ORDER BY pt.id
      `,
    [id, (session.user as any).id],
  );

  return Response.json(result.rows);
}
