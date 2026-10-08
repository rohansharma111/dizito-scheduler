import { razorpay } from "@/lib/razorpay";
import { BillingProvider, CreateSubscriptionInput, UpdateSubscriptionInput } from "./types";
import { RazorpaySubscriptionEntity } from "./razorpay-types";

function normalizeSubscription(
  subscription: Awaited<ReturnType<typeof razorpay.subscriptions.create>>,
): RazorpaySubscriptionEntity {
  return {
    id: subscription.id,
    customer_id: subscription.customer_id ?? null,
    plan_id: subscription.plan_id,
    status: subscription.status,
    current_start: subscription.current_start ?? null,
    current_end: subscription.current_end ?? null,
    charge_at: subscription.charge_at ?? null,
    start_at: subscription.start_at ?? null,
    end_at: subscription.end_at ?? null,
    total_count: subscription.total_count,
    paid_count: subscription.paid_count,
    remaining_count: subscription.remaining_count,
    notes: subscription.notes,
  };
}

export const razorpayProvider: BillingProvider = {
  async createSubscription(input: CreateSubscriptionInput): Promise<RazorpaySubscriptionEntity> {
    const startAt =
      input.trialDays > 0
        ? Math.floor(Date.now() / 1000) + input.trialDays * 24 * 60 * 60
        : undefined;

    const subscription = await razorpay.subscriptions.create({
      plan_id: input.providerPlanId,
      total_count: 120,
      customer_notify: 1,
      notes: {
        userId: String(input.userId),
        email: input.email,
        plan: input.plan,
      },
      ...(startAt ? { start_at: startAt } : {}),
    });

    return normalizeSubscription(subscription);
  },

  async updateSubscription(
    providerSubscriptionId: string,
    input: UpdateSubscriptionInput,
  ): Promise<RazorpaySubscriptionEntity> {
    const subscription = await razorpay.subscriptions.update(providerSubscriptionId, {
      plan_id: input.providerPlanId,
      schedule_change_at: input.scheduleChangeAt ?? "now",
      customer_notify: input.customerNotify ?? true,
    });

    return normalizeSubscription(subscription);
  },

  async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtCycleEnd: boolean,
  ): Promise<RazorpaySubscriptionEntity> {
    const subscription = await razorpay.subscriptions.cancel(providerSubscriptionId, {
      cancel_at_cycle_end: cancelAtCycleEnd,
    });

    return normalizeSubscription(subscription);
  },

  async fetchSubscription(providerSubscriptionId: string): Promise<RazorpaySubscriptionEntity> {
    const subscription = await razorpay.subscriptions.fetch(providerSubscriptionId);
    return normalizeSubscription(subscription);
  },
};
