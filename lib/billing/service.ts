import { billingProviders } from "./providers/registry";
import { billingPlans } from "./plans";
import { BillingPlan, SubscriptionStatus } from "./types";
import { BILLING_TOTAL_COUNT, BILLING_TRIAL_DAYS } from "./constants";
import { BillingRepository } from "./repository";

export async function createSubscription(params: {
  userId: number;
  email: string;
  plan: BillingPlan;
}) {
  const plan = billingPlans[params.plan];

  if (!plan?.planId) {
    throw new Error("Billing plan not configured");
  }

  /*
    Prevent duplicate subscriptions
  */

  const existing = await BillingRepository.getActiveSubscriptionForUser(
    params.userId,
  );

  if (existing) {
    throw new Error("Subscription already exists");
  }

  /*
    Create Razorpay subscription
  */

  const provider = billingProviders.razorpay;

  const razorpaySubscription = await provider.createSubscription({
    userId: params.userId,

    email: params.email,

    plan: params.plan,

    planId: plan.planId,
  });

  /*
    Save pending subscription
  */

  const subscription = await BillingRepository.createSubscription({
    userId: params.userId,

    provider: "razorpay",

    providerSubscriptionId: razorpaySubscription.id,

    plan: params.plan,

    status: razorpaySubscription.status as SubscriptionStatus,

    metadata: razorpaySubscription,
  });

  return {
    subscription,

    razorpaySubscription,
  };
}
