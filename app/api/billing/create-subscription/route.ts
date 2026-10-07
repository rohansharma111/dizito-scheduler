import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createSubscription } from "@/lib/billing/service";
import type { BillingPlan } from "@/lib/billing/types";

const purchasablePlans = new Set<BillingPlan>(["growth", "pro"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const plan = body.plan as BillingPlan;
    if (!purchasablePlans.has(plan)) {
      return Response.json({ error: "Invalid or unavailable plan" }, { status: 400 });
    }

    const userId = Number((session.user as any).id);
    const userResult = await pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
    const user = userResult.rows[0];
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const result = await createSubscription({
      userId,
      email: user.email ?? "",
      plan,
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
      { error: error instanceof Error ? error.message : "Failed to create subscription" },
      { status: 500 },
    );
  }
}
