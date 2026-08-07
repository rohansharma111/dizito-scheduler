import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { getPlan } from "@/lib/plans";

export async function GET() {
  try {
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

    /*
      User + Plan
    */

    const userResult = await pool.query(
      `
      SELECT
        id,
        email,
        plan
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return Response.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    const plan = getPlan(user.plan);

    /*
      Connected Accounts
    */

    const accountsResult = await pool.query(
      `
      SELECT COUNT(*)
      FROM social_accounts
      WHERE user_id = $1
      `,
      [userId],
    );

    const accountsUsed = Number(accountsResult.rows[0].count);

    /*
      Current Month Usage
    */

    const now = new Date();

    const month = now.getMonth() + 1;

    const year = now.getFullYear();

    const usageResult = await pool.query(
      `
      SELECT
        posts_created,
        posts_published,
        ai_images_generated
      FROM user_usage
      WHERE
        user_id = $1
        AND month = $2
        AND year = $3
      `,
      [userId, month, year],
    );

    const usage = usageResult.rows[0] || {
      posts_created: 0,
      posts_published: 0,
      ai_images_generated: 0,
    };

    /*
      Dashboard Response
    */

    return Response.json({
      plan: {
        id: user.plan,
        name: plan.name,
        price: plan.price,
      },

      accounts: {
        used: accountsUsed,
        limit: plan.accounts,
        remaining: Math.max(0, plan.accounts - accountsUsed),
      },

      posts: {
        created: usage.posts_created,
        published: usage.posts_published,

        limit: plan.monthlyPosts,

        remaining:
          plan.monthlyPosts === Number.MAX_SAFE_INTEGER
            ? null
            : Math.max(0, plan.monthlyPosts - usage.posts_created),
      },

      ai: {
        imagesGenerated: usage.ai_images_generated,

        imageLimit: plan.aiImages,

        remaining:
          plan.aiImages === Number.MAX_SAFE_INTEGER
            ? null
            : Math.max(0, plan.aiImages - usage.ai_images_generated),
      },

      features: {
        bulkUpload: plan.bulkUpload,

        retrySystem: plan.retrySystem,

        calendar: plan.calendar,

        drafts: plan.drafts,

        analytics: plan.analytics,

        prioritySupport: plan.prioritySupport,
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
