import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
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

  const { id } =
    await context.params;

  /*
    Verify account ownership
  */

  const accountResult =
    await pool.query(
      `
      SELECT *
      FROM social_accounts
      WHERE
        id = $1
        AND user_id = $2
      `,
      [
        id,
        userId,
      ]
    );

  if (
    accountResult.rows.length === 0
  ) {
    return Response.json(
      {
        error:
          "Account not found",
      },
      {
        status: 404,
      }
    );
  }

  /*
    Check active targets
  */

  const targetsResult =
    await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM post_targets
      WHERE
        social_account_id = $1
        AND status IN
        (
          'scheduled',
          'processing'
        )
      `,
      [id]
    );

  const activeTargets =
    Number(
      targetsResult.rows[0]
        .count
    );

  if (
    activeTargets > 0
  ) {
    return Response.json(
      {
        error:
          "This account still has scheduled posts.",
        scheduledPosts:
          activeTargets,
      },
      {
        status: 400,
      }
    );
  }

  /*
    Safe delete
  */

  await pool.query(
    `
    DELETE
    FROM social_accounts
    WHERE
      id = $1
      AND user_id = $2
    `,
    [
      id,
      userId,
    ]
  );

  return Response.json({
    success: true,
  });
}