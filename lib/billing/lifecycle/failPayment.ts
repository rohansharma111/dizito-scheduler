import { syncSubscription } from "../sync/syncSubscription";
import { createBillingEvent } from "../events";
import { billingLogger } from "../logger";
import { BILLING_GRACE_PERIOD_DAYS } from "../constants";

export async function failPayment(payload: any) {
  /*
    Razorpay subscription entity
  */
  const subscription = payload.payload.subscription.entity;

  /*
    Grace period
  */
  const now = new Date();

  const gracePeriodUntil = new Date(
    now.getTime() + BILLING_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  /*
    Sync subscription
  */
  const result = await syncSubscription({
    providerSubscriptionId: subscription.id,

    status: "payment_failed",

    providerCustomerId: subscription.customer_id,

    paymentFailedAt: now,

    gracePeriodUntil,

    metadata: payload,
  });

  /*
    Billing event
  */
  await createBillingEvent(
    "PAYMENT_FAILED",

    result.id,

    result.user_id,

    {
      plan: result.plan,

      gracePeriodUntil,

      providerSubscriptionId: subscription.id,
    },
  );

  /*
    Log
  */
  billingLogger.warn(
    "Payment failed",

    {
      subscriptionId: result.id,

      providerSubscriptionId: subscription.id,

      gracePeriodUntil,
    },
  );

  return result;
}
