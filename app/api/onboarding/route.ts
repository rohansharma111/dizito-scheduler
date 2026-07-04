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
      Connected accounts
    */
    const accountsResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM social_accounts
        WHERE user_id = $1
        `,
      [userId],
    );

    /*
      Posts created
    */
    const postsResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM posts
        WHERE user_id = $1
        `,
      [userId],
    );

    /*
      Posts scheduled/published
      (consider onboarding complete
       once they actually schedule
       something)
    */
    const scheduledResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM posts
        WHERE
          user_id = $1
          AND (
            status = 'scheduled'
            OR status = 'published'
          )
        `,
      [userId],
    );

    /*
      User onboarding state
    */
    const userResult = await pool.query(
      `
        SELECT
          onboarding_completed,
          onboarding_step
        FROM users
        WHERE id = $1
        `,
      [userId],
    );

    const user = userResult.rows[0] || {};

    return Response.json({
      connectedAccounts: Number(accountsResult.rows[0].count),

      postsCreated: Number(postsResult.rows[0].count),

      postsScheduled: Number(scheduledResult.rows[0].count),

      onboardingCompleted: user.onboarding_completed ?? false,

      onboardingStep: user.onboarding_step ?? 1,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Failed to load onboarding",
      },
      {
        status: 500,
      },
    );
  }
}
