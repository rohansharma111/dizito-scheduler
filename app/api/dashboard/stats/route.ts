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

  /*
    POSTS
  */

  const postsResult =
    await pool.query(
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
          WHERE
            status = 'draft'
            AND schedule_time IS NULL
        ) AS draft

      FROM posts
      WHERE user_id = $1
      `,
      [userId]
    );

  /*
    TARGETS
  */

  const targetsResult =
    await pool.query(
      `
      SELECT

        COUNT(*) FILTER (
          WHERE pt.status = 'scheduled'
        ) AS scheduled_targets,

        COUNT(*) FILTER (
          WHERE pt.status = 'published'
        ) AS published_targets,

        COUNT(*) FILTER (
          WHERE pt.status = 'failed'
        ) AS failed_targets

      FROM post_targets pt

      INNER JOIN posts p
        ON p.id = pt.post_id

      WHERE p.user_id = $1
      `,
      [userId]
    );

  /*
    ACCOUNTS
  */

  const accountsResult =
    await pool.query(
      `
      SELECT COUNT(*) AS accounts
      FROM social_accounts
      WHERE user_id = $1
      `,
      [userId]
    );

  /*
    SUCCESS RATE
  */

  const publishedTargets =
    Number(
      targetsResult.rows[0]
        .published_targets
    );

  const failedTargets =
    Number(
      targetsResult.rows[0]
        .failed_targets
    );

  const totalAttempts =
    publishedTargets +
    failedTargets;

  const successRate =
    totalAttempts > 0
      ? Math.round(
          (
            publishedTargets /
            totalAttempts
          ) * 100
        )
      : 100;

  return Response.json({
    /*
      Existing cards
    */

    scheduled:
      Number(
        postsResult.rows[0]
          .scheduled
      ),

    published:
      Number(
        postsResult.rows[0]
          .published
      ),

    failed:
      Number(
        postsResult.rows[0]
          .failed
      ),

    draft:
      Number(
        postsResult.rows[0]
          .draft
      ),

    accounts:
      Number(
        accountsResult.rows[0]
          .accounts
      ),

    /*
      New target metrics
    */

    scheduledTargets:
      Number(
        targetsResult.rows[0]
          .scheduled_targets
      ),

    publishedTargets,

    failedTargets,

    successRate,
  });
}