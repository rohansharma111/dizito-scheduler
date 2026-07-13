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
      User
    */
    const userResult = await pool.query(
      `
      SELECT
        id,
        plan,
        subscription_id,
        subscription_status,
        current_period_end,
        created_at
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

    /*
      Current Subscription
    */
    const subscriptionResult = await pool.query(
      `
      SELECT
        provider,
        provider_subscription_id,
        provider_customer_id,
        plan,
        status,
        trial_start_at,
        trial_end_at,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );

    const subscription = subscriptionResult.rows[0] ?? null;

    /*
      Plan
    */
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
      Monthly Usage
    */
    const now = new Date();

    const year = now.getFullYear();

    const month = now.getMonth() + 1;

    const usageResult = await pool.query(
      `
      SELECT
        posts_created,
        posts_published,
        bulk_upload_rows
      FROM user_usage
      WHERE
        user_id = $1
        AND year = $2
        AND month = $3
      `,
      [userId, year, month],
    );

    const usage = usageResult.rows[0] ?? {
      posts_created: 0,
      posts_published: 0,
      bulk_upload_rows: 0,
    };

    /*
      Trial
    */
    let trialDaysLeft = 0;

    if (subscription?.trial_end_at) {
      trialDaysLeft = Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_end_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      );
    }

    /*
      Billing History
    */
    const historyResult = await pool.query(
      `
      SELECT
        event,
        amount,
        created_at
      FROM billing_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [userId],
    );

    return Response.json({
      plan: user.plan,

      planDetails: {
        name: plan.name,
        price: plan.price,

        accounts: plan.accounts,

        monthlyPosts: plan.monthlyPosts,

        bulkUpload: plan.bulkUpload,

        retrySystem: plan.retrySystem,

        calendar: plan.calendar,

        drafts: plan.drafts,

        analytics: plan.analytics,

        prioritySupport: plan.prioritySupport,
      },

      subscription: {
        provider: subscription?.provider ?? null,

        id: subscription?.provider_subscription_id ?? null,

        customerId: subscription?.provider_customer_id ?? null,

        status: subscription?.status ?? user.subscription_status,

        subscriptionPlan: subscription?.plan ?? user.plan,

        renewalDate:
          subscription?.current_period_end ?? user.current_period_end,

        trialDaysLeft,

        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      },

      usage: {
        accountsUsed,

        accountsLimit: plan.accounts,

        postsUsed: usage.posts_created,

        postsLimit: plan.monthlyPosts,

        published: usage.posts_published,

        bulkUploads: usage.bulk_upload_rows,
      },

      features: {
        bulkUpload: plan.bulkUpload,

        retrySystem: plan.retrySystem,

        calendar: plan.calendar,

        drafts: plan.drafts,

        analytics: plan.analytics,

        prioritySupport: plan.prioritySupport,
      },

      billingHistory: historyResult.rows,

      earlyAdopter: true,
    });
  } catch (error) {
    console.error("Billing API Error:", error);

    return Response.json(
      {
        error: "Failed to load billing",
      },
      {
        status: 500,
      },
    );
  }
}
