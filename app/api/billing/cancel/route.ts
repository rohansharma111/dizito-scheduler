import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";

export async function POST() {
  try {
    /*
      Authenticate
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

    /*
      Get subscription
    */
    const userResult = await pool.query(
      `
        SELECT
          subscription_id,
          subscription_status,
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

    if (!user.subscription_id) {
      return Response.json(
        {
          error: "No active subscription",
        },
        {
          status: 400,
        },
      );
    }

    /*
      Cancel subscription
    */
    await razorpay.subscriptions.cancel(
      user.subscription_id,
      true, // cancel immediately
    );

    /*
      Downgrade user
    */
    await pool.query(
      `
      UPDATE users
      SET
        plan = 'free',
        subscription_status =
          'cancelled'
      WHERE id = $1
      `,
      [userId],
    );

    /*
      Create event
    */
    await pool.query(
      `
      INSERT INTO system_events
      (
        event_type,
        entity_type,
        entity_id,
        user_id,
        payload
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        "SUBSCRIPTION_CANCELLED",
        "subscription",
        0,
        userId,
        JSON.stringify({
          previousPlan: user.plan,
          subscriptionId: user.subscription_id,
        }),
      ],
    );

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    );
  }
}
