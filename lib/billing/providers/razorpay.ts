import { razorpay } from "@/lib/razorpay";
import { BillingProvider, CreateSubscriptionInput, UpdateSubscriptionInput } from "./types";

export const razorpayProvider: BillingProvider = {
  async createSubscription(input: CreateSubscriptionInput) {
    const startAt =
      input.trialDays > 0
        ? Math.floor(Date.now() / 1000) + input.trialDays * 24 * 60 * 60
        : undefined;

    return razorpay.subscriptions.create({
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
  },

  async updateSubscription(
    providerSubscriptionId: string,
    input: UpdateSubscriptionInput,
  ) {
    return razorpay.subscriptions.update(providerSubscriptionId, {
      plan_id: input.providerPlanId,
      schedule_change_at: input.scheduleChangeAt ?? "now",
      customer_notify: input.customerNotify ?? true,
    });
  },

  async cancelSubscription(
    providerSubscriptionId: string,
    cancelAtCycleEnd: boolean,
  ) {
    return razorpay.subscriptions.cancel(providerSubscriptionId, {
      cancel_at_cycle_end: cancelAtCycleEnd,
    });
  },

  async fetchSubscription(providerSubscriptionId: string) {
    return razorpay.subscriptions.fetch(providerSubscriptionId);
  },
};
