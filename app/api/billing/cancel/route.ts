import { getServerSession } from "next-auth";
import { getBillingUserId } from "@/lib/billing/session";
import { authOptions } from "@/lib/auth";
import { BillingRepository } from "@/lib/billing/repository";
import { billingProviders } from "@/lib/billing/providers/registry";
import { updateUserPlan } from "@/lib/billing/updateUserPlan";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const userId = getBillingUserId(session);
    const body = await request.json().catch(() => ({}));
    const immediate = body.immediate === true;
    const subscription = await BillingRepository.getActiveSubscriptionForUser(userId);
    if (!subscription?.provider_subscription_id) return Response.json({ error: "No active subscription" }, { status: 400 });
    await billingProviders.razorpay.cancelSubscription(subscription.provider_subscription_id, !immediate);
    if (immediate) {
      await BillingRepository.cancelSubscription(subscription.provider_subscription_id);
      await updateUserPlan(userId, "free");
    } else {
      await BillingRepository.updateSubscription(subscription.provider_subscription_id, { cancelAtPeriodEnd: true, planChangeAt: subscription.current_period_end });
    }
    return Response.json({ success: true, cancelAtPeriodEnd: !immediate });
  } catch (error) {
    console.error("CANCEL SUBSCRIPTION ERROR", error);
    return Response.json({ error: error instanceof Error ? error.message : "Cancellation failed" }, { status: 500 });
  }
}
