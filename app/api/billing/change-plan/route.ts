import { getServerSession } from "next-auth";
import { getBillingUserId } from "@/lib/billing/session";
import { authOptions } from "@/lib/auth";
import { changeSubscriptionPlan } from "@/lib/billing/service";
import type { BillingPlan } from "@/lib/billing/types";

const allowed = new Set<BillingPlan>(["free", "growth", "pro"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const targetPlan = body.plan as BillingPlan;
    if (!allowed.has(targetPlan)) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    const result = await changeSubscriptionPlan({
      userId: getBillingUserId(session),
      targetPlan,
    });

    return Response.json({ success: true, subscription: result ?? null });
  } catch (error) {
    console.error("CHANGE PLAN ERROR", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Plan change failed" },
      { status: 400 },
    );
  }
}
