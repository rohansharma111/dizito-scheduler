import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

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

  try {
    /*
      Published
    */
    const published = await pool.query(
      `
        SELECT COUNT(*)
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
          AND pt.status = 'published'
        `,
      [userId],
    );

    /*
      Failed
    */
    const failed = await pool.query(
      `
        SELECT COUNT(*)
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
          AND pt.status = 'permanent_failed'
        `,
      [userId],
    );

    /*
      Scheduled
    */
    const scheduled = await pool.query(
      `
        SELECT COUNT(*)
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
          AND pt.status IN
          (
            'scheduled',
            'retry_scheduled',
            'processing'
          )
        `,
      [userId],
    );

    /*
      Accounts
    */
    const accounts = await pool.query(
      `
        SELECT COUNT(*)
        FROM social_accounts
        WHERE user_id = $1
        `,
      [userId],
    );

    /*
      Platform distribution
    */
    const platforms = await pool.query(
      `
        SELECT
          pt.platform,
          COUNT(*)::int AS count
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
          AND pt.status = 'published'
        GROUP BY
          pt.platform
        ORDER BY
          count DESC
        `,
      [userId],
    );

    const topPlatform =
      platforms.rows.length > 0 ? platforms.rows[0].platform : null;

    /*
      Daily publishing
    */
    const daily = await pool.query(
      `
        SELECT
          DATE(
            pt.published_at
          ) AS day,
          COUNT(*)::int AS count
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
          AND pt.status = 'published'
          AND pt.published_at >=
              NOW() - INTERVAL '30 days'
        GROUP BY
          day
        ORDER BY
          day
        `,
      [userId],
    );

    /*
      Success rate
    */
    const totals = await pool.query(
      `
        SELECT
          COUNT(*) FILTER
          (
            WHERE
              pt.status='published'
          )::int
            AS published,

          COUNT(*) FILTER
          (
            WHERE
              pt.status='permanent_failed'
          )::int
            AS failed

        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          p.user_id = $1
        `,
      [userId],
    );

    const totalPublished = totals.rows[0]?.published || 0;

    const totalFailed = totals.rows[0]?.failed || 0;

    const successRate =
      totalPublished + totalFailed === 0
        ? 0
        : Math.round((totalPublished / (totalPublished + totalFailed)) * 100);

    /*
      Insights
    */
    const insights: string[] = [];

    if (successRate >= 95) {
      insights.push("Excellent publishing success rate");
    }

    if (topPlatform) {
      insights.push(`${topPlatform} is your most active platform`);
    }

    if (Number(failed.rows[0].count) === 0) {
      insights.push("No permanent failures detected");
    }

    if (Number(published.rows[0].count) > 100) {
      insights.push("You've published over 100 posts");
    }

    if (Number(accounts.rows[0].count) >= 3) {
      insights.push("You're actively using multiple social accounts");
    }

    /*
      Recent activity
    */
    const recent = await pool.query(
      `
        SELECT
          event_type,
          payload,
          created_at
        FROM system_events
        WHERE user_id = $1
        ORDER BY
          created_at DESC
        LIMIT 10
        `,
      [userId],
    );

    return Response.json({
      cards: {
        published: Number(published.rows[0].count),

        failed: Number(failed.rows[0].count),

        scheduled: Number(scheduled.rows[0].count),

        accounts: Number(accounts.rows[0].count),

        successRate,
      },

      platforms: platforms.rows,

      daily: daily.rows,

      topPlatform,

      insights,

      recent: recent.rows,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Failed to load analytics",
      },
      {
        status: 500,
      },
    );
  }
}
