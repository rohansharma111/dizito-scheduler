import { syncSubscription } from "../sync/syncSubscription";
import { createBillingEvent } from "../events";
import { billingLogger } from "../logger";
import { BILLING_GRACE_PERIOD_DAYS } from "../constants";
import { BillingRepository } from "../repository";

export async function failPayment(payload: Record<string, unknown>) {
  const payloadBody = payload.payload as { subscription?: { entity?: any }; payment?: { entity?: { subscription_id?: string } } } | undefined;
  const subscriptionEntity = payloadBody?.subscription?.entity;
  const paymentEntity = payloadBody?.payment?.entity;
  const providerSubscriptionId =
    subscriptionEntity?.id ?? paymentEntity?.subscription_id;

  if (!providerSubscriptionId) {
    throw new Error("Payment failure payload does not identify a subscription");
  }

  const subscription = subscriptionEntity
    ? subscriptionEntity
    : await BillingRepository.getSubscriptionByProviderId(providerSubscriptionId);

  if (!subscription) throw new Error("Subscription not found");

  const now = new Date();
  const gracePeriodUntil = new Date(
    now.getTime() + BILLING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  const result = await syncSubscription({
    providerSubscriptionId,
    status: "grace_period",
    providerCustomerId: subscriptionEntity?.customer_id ?? subscription.provider_customer_id,
    paymentFailedAt: now,
    gracePeriodUntil,
    metadata: payload,
  });

  await createBillingEvent(
    "PAYMENT_FAILED",
    result.id,
    result.user_id,
    {
      plan: result.plan,
      gracePeriodUntil,
      providerSubscriptionId,
    },
  );

  billingLogger.warn("Payment failed; grace period started", {
    subscriptionId: result.id,
    providerSubscriptionId,
    gracePeriodUntil,
  });

  return result;
}
