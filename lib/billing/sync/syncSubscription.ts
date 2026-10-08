import { BillingRepository } from "../repository";
import { SubscriptionStatus } from "../types";
import { PoolClient } from "pg";

type SyncSubscriptionInput = {
  providerSubscriptionId: string;

  status: SubscriptionStatus;

  providerCustomerId?: string | null;

  currentPeriodStart?: Date | null;

  currentPeriodEnd?: Date | null;

  trialStartAt?: Date | null;

  trialEndAt?: Date | null;

  cancelAtPeriodEnd?: boolean;

  cancelledAt?: Date | null;

  endedAt?: Date | null;

  paymentFailedAt?: Date | null;

  gracePeriodUntil?: Date | null;

  metadata?: unknown;
};

export async function syncSubscription(
  input: SyncSubscriptionInput,
  client?: PoolClient,
) {
  const subscription = await BillingRepository.updateSubscription(
    input.providerSubscriptionId,
    {
      status: input.status,

      providerCustomerId: input.providerCustomerId,

      currentPeriodStart: input.currentPeriodStart,

      currentPeriodEnd: input.currentPeriodEnd,

      trialStartAt: input.trialStartAt,

      trialEndAt: input.trialEndAt,

      cancelAtPeriodEnd: input.cancelAtPeriodEnd,

      cancelledAt: input.cancelledAt,

      endedAt: input.endedAt,

      paymentFailedAt: input.paymentFailedAt,

      gracePeriodUntil: input.gracePeriodUntil,

      metadata: input.metadata,
    },
    client,
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  return subscription;
}
