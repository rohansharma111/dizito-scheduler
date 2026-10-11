import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getCommerceChannels } from "@/lib/commerce/channels/service";

export async function GET() {
  try {
    /*
      Auth
    */
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
    const commerceChannels = await getCommerceChannels(Number(userId));

    /*
      User
    */
    const userResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        plan,
        subscription_status,
        subscription_id
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
      Subscription
    */
    const subscriptionResult = await pool.query(
      `
      SELECT
        plan,
        status,
        current_period_start,
        current_period_end,
        trial_end_at,
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
      Connected accounts
    */
    const accountsResult = await pool.query(
      `
      SELECT
        id,
        platform,
        account_name,
        status
      FROM social_accounts
      WHERE user_id = $1
      ORDER BY platform
      `,
      [userId],
    );

    /*
      Response
    */
    return Response.json({
      account: {
        id: user.id,

        name: user.name,

        email: user.email,
      },

      subscription: {
        plan: user.plan,

        subscriptionId: user.subscription_id,

        status: subscription?.status ?? user.subscription_status ?? "free",

        currentPeriodStart: subscription?.current_period_start,

        currentPeriodEnd: subscription?.current_period_end,

        trialEnd: subscription?.trial_end_at,

        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      },

      connectedAccounts: accountsResult.rows,

      commerceChannels,

      preferences: {
        emailNotifications: true,

        publishSuccess: true,

        publishFailure: true,
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
