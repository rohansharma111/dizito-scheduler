import { BillingPlan } from "../types";
import { RazorpaySubscriptionEntity } from "./razorpay-types";

export type CreateSubscriptionInput = {
  userId: number;
  email: string;
  plan: BillingPlan;
  providerPlanId: string;
  trialDays: number;
};

export type UpdateSubscriptionInput = {
  providerPlanId: string;
  scheduleChangeAt?: "now" | "cycle_end";
  customerNotify?: boolean;
};

export type BillingProvider = {
  createSubscription(input: CreateSubscriptionInput): Promise<RazorpaySubscriptionEntity>;
  updateSubscription(providerSubscriptionId: string, input: UpdateSubscriptionInput): Promise<RazorpaySubscriptionEntity>;
  cancelSubscription(providerSubscriptionId: string, cancelAtCycleEnd: boolean): Promise<RazorpaySubscriptionEntity>;
  fetchSubscription(providerSubscriptionId: string): Promise<RazorpaySubscriptionEntity>;
};
