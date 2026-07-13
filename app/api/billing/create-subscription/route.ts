import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { BillingPlan } from "@/lib/billing/types";
import { createSubscription } from "@/lib/billing/service";

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

    /*
      User
    */
    const userId = (session.user as any).id;

    const userResult = await pool.query(
      `
      SELECT
        id,
        email
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
      Billing Service
    */
    const result = await createSubscription({
      userId: user.id,

      email: user.email ?? "",

      plan: planName,
    });

    return Response.json({
      success: true,

      subscriptionId: result.razorpaySubscription.id,

      status: result.razorpaySubscription.status,

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
