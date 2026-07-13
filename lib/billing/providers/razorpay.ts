import { razorpay } from "@/lib/razorpay";

import { BillingProvider, CreateSubscriptionInput } from "./types";

export const razorpayProvider: BillingProvider = {
  async createSubscription(input: CreateSubscriptionInput) {
    return razorpay.subscriptions.create({
      plan_id: input.planId,

      total_count: 120,

      customer_notify: 1,

      notes: {
        userId: String(input.userId),

        email: input.email,

        plan: input.plan,
      },

      start_at: Math.floor(Date.now() / 1000),
      //Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });
  },

  async cancelSubscription(providerSubscriptionId: string) {
    return razorpay.subscriptions.cancel(providerSubscriptionId, true);
  },

  async fetchSubscription(providerSubscriptionId: string) {
    return razorpay.subscriptions.fetch(providerSubscriptionId);
  },
};
