import { billingProviders } from "./providers/registry";
import { BillingRepository } from "./repository";
import { getProviderPlanMapping } from "./provider-mapping";
import { BillingPlan, SubscriptionStatus } from "./types";
import { updateUserPlan } from "./updateUserPlan";

function legacyMirror(plan: BillingPlan) {
  if (plan === "agency") return "agency";
  if (plan === "free") return "free";
  return "creator";
}

export async function createSubscription(params: {
  userId: number;
  email: string;
  plan: BillingPlan;
}) {
  if (params.plan === "free" || params.plan === "agency") {
    throw new Error("This plan is not currently purchasable");
  }

  const mapping = await getProviderPlanMapping(params.plan, "razorpay");
  if (!mapping) {
    throw new Error("Razorpay plan mapping is not configured for this plan");
  }

  const existing = await BillingRepository.getActiveSubscriptionForUser(params.userId);
  if (existing) throw new Error("Subscription already exists");

  const planResult = await BillingRepository.getPlanByCode(params.plan);
  if (!planResult || !planResult.is_active) throw new Error("Billing plan not available");

  const razorpaySubscription = await billingProviders.razorpay.createSubscription({
    userId: params.userId,
    email: params.email,
    plan: params.plan,
    providerPlanId: mapping.provider_plan_id,
    trialDays: planResult.trial_days,
  });

  const subscription = await BillingRepository.createSubscription({
    userId: params.userId,
    provider: "razorpay",
    providerSubscriptionId: razorpaySubscription.id,
    providerCustomerId: razorpaySubscription.customer_id ?? null,
    plan: params.plan,
    billingPlanId: planResult.id,
    status: razorpaySubscription.status as SubscriptionStatus,
    trialStartAt: razorpaySubscription.start_at
      ? new Date(razorpaySubscription.start_at * 1000)
      : null,
    trialEndAt: razorpaySubscription.charge_at
      ? new Date(razorpaySubscription.charge_at * 1000)
      : null,
    metadata: razorpaySubscription,
  });

  await updateUserPlan(params.userId, legacyMirror(params.plan));
  return { subscription, razorpaySubscription };
}

export async function changeSubscriptionPlan(params: {
  userId: number;
  targetPlan: BillingPlan;
}) {
  const subscription = await BillingRepository.getActiveSubscriptionForUser(params.userId);
  if (!subscription?.provider_subscription_id) throw new Error("No active subscription");

  if (params.targetPlan === "free") {
    await billingProviders.razorpay.cancelSubscription(
      subscription.provider_subscription_id,
      true,
    );
    return BillingRepository.updateSubscription(subscription.provider_subscription_id, {
      cancelAtPeriodEnd: true,
      planChangeAt: subscription.current_period_end,
    });
  }

  const mapping = await getProviderPlanMapping(params.targetPlan, "razorpay");
  if (!mapping) throw new Error("Razorpay plan mapping is not configured for this plan");

  const target = await BillingRepository.getPlanByCode(params.targetPlan);
  if (!target || !target.is_active) throw new Error("Target plan is not available");

  await billingProviders.razorpay.updateSubscription(
    subscription.provider_subscription_id,
    {
      providerPlanId: mapping.provider_plan_id,
      scheduleChangeAt: "now",
    },
  );

  const result = await BillingRepository.updateSubscription(
    subscription.provider_subscription_id,
    {
      pendingBillingPlanId: target.id,
      planChangeAt: new Date(),
      billingPlanId: target.id,
      plan: params.targetPlan,
    },
  );

  await updateUserPlan(params.userId, legacyMirror(params.targetPlan));
  return result;
}
