import { razorpay } from "@/lib/razorpay";
import { BillingProvider, CreateSubscriptionInput, UpdateSubscriptionInput } from "./types";
import { RazorpaySubscriptionEntity } from "./razorpay-types";

function normalizeSubscription(subscription: unknown): RazorpaySubscriptionEntity {
  if (!subscription || typeof subscription !== "object") {
    throw new Error("Razorpay returned an invalid subscription response");
  }

  const entity = subscription as RazorpaySubscriptionEntity;

  return {
    id: entity.id,
    customer_id: entity.customer_id ?? null,
    plan_id: entity.plan_id,
    status: entity.status,
    current_start: entity.current_start ?? null,
    current_end: entity.current_end ?? null,
    charge_at: entity.charge_at ?? null,
    start_at: entity.start_at ?? null,
    end_at: entity.end_at ?? null,
    total_count: entity.total_count,
    paid_count: entity.paid_count,
    remaining_count: entity.remaining_count,
    notes: entity.notes,
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
    const scheduleChangeAt: "now" | "cycle_end" = input.scheduleChangeAt ?? "now";

    const subscription = await razorpay.subscriptions.update(providerSubscriptionId, {
      plan_id: input.providerPlanId,
      schedule_change_at: scheduleChangeAt,
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
