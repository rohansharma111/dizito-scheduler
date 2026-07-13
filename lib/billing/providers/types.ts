import { BillingPlan } from "../types";

export type CreateSubscriptionInput = {
  userId: number;

  email: string;

  plan: BillingPlan;

  planId: string;
};

export type BillingProvider = {
  createSubscription(input: CreateSubscriptionInput): Promise<any>;

  cancelSubscription(providerSubscriptionId: string): Promise<any>;

  fetchSubscription(providerSubscriptionId: string): Promise<any>;
};
