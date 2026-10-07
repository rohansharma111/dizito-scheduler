import { BillingPlan } from "../types";

export type CreateSubscriptionInput = {
  userId: number;
  email: string;
  plan: BillingPlan;
  providerPlanId: string;
  trialDays: number;
};

export type UpdateSubscriptionInput = {
  providerPlanId: string;
  scheduleChangeAt?: string;
  customerNotify?: boolean;
};

export type BillingProvider = {
  createSubscription(input: CreateSubscriptionInput): Promise<any>;
  updateSubscription(providerSubscriptionId: string, input: UpdateSubscriptionInput): Promise<any>;
  cancelSubscription(providerSubscriptionId: string, cancelAtCycleEnd: boolean): Promise<any>;
  fetchSubscription(providerSubscriptionId: string): Promise<any>;
};
