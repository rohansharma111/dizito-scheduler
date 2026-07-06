import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";
import { billingPlans } from "@/lib/billing/plans";
import { BillingPlan } from "@/lib/billing/types";

export async function POST(request: Request) {
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

    /*
      Body
    */
    const body = await request.json();

    /*
      Validate plan
    */
    if (body.plan !== "creator" && body.plan !== "agency") {
      return Response.json(
        {
          error: "Invalid plan",
        },
        {
          status: 400,
        },
      );
    }

    const planName = body.plan as BillingPlan;

    const plan = billingPlans[planName];

    if (!plan?.planId) {
      return Response.json(
        {
          error: "Billing plan not configured",
        },
        {
          status: 500,
        },
      );
    }

    /*
      User
    */
    const userId = (session.user as any).id;

    const userResult = await pool.query(
      `
        SELECT *
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
      Prevent duplicate
      active subscriptions
    */
    if (
      user.subscription_id &&
      ["active", "authenticated", "created"].includes(user.subscription_status)
    ) {
      return Response.json(
        {
          error: "Subscription already exists",
        },
        {
          status: 400,
        },
      );
    }

    /*
      Create Razorpay
      subscription
    */
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,

      total_count: 120,

      customer_notify: 1,

      notes: {
        userId: String(user.id),

        plan: planName,

        email: user.email ?? "",
      },

      /*
            7 day free trial
          */
      start_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });

    /*
      Save pending
      subscription
    */
    await pool.query(
      `
      UPDATE users
      SET
        billing_provider = 'razorpay',

        subscription_id = $1,

        subscription_status = $2,

        subscription_plan = $3

      WHERE id = $4
      `,
      [subscription.id, subscription.status, planName, user.id],
    );

    return Response.json({
      success: true,

      subscriptionId: subscription.id,

      status: subscription.status,

      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("CREATE SUBSCRIPTION ERROR", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create subscription",
      },
      {
        status: 500,
      },
    );
  }
}
