import { syncSubscription } from "../sync/syncSubscription";
import { createBillingEvent } from "../events";
import { billingLogger } from "../logger";
import { BillingContext } from "../context";

export async function authenticateSubscriptionLifecycle(context: BillingContext) {
  const entity = context.entity;

  const result = await syncSubscription({
    providerSubscriptionId: entity.id,

    status: "authenticated",

    providerCustomerId: entity.customer_id ?? null,

    trialStartAt: entity.start_at ? new Date(entity.start_at * 1000) : null,

    trialEndAt: entity.charge_at ? new Date(entity.charge_at * 1000) : null,

    metadata: context.webhook.payload,
  });

  await createBillingEvent(
    "SUBSCRIPTION_AUTHENTICATED",

    result.id,

    result.user_id,

    {
      plan: result.plan,

      providerSubscriptionId: entity.id,

      providerCustomerId: entity.customer_id ?? null,
    },
  );

  billingLogger.info("Subscription authenticated", result.id);

  return result;
}
