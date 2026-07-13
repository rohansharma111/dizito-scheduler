import { withTransaction } from "@/lib/core/transaction";
import { BillingContext } from "../context";
import { syncSubscription } from "../sync/syncSubscription";
import { updateUserPlan } from "../updateUserPlan";
import { createBillingEvent } from "../events";
import { billingLogger } from "../logger";

export async function activateSubscription(context: BillingContext) {
  const entity = context.entity;

  return await withTransaction(async (client) => {
    /*
      Sync subscription
    */
    const result = await syncSubscription(
      {
        providerSubscriptionId: entity.id,

        status: "active",

        providerCustomerId: entity.customer_id,

        currentPeriodStart: entity.current_start
          ? new Date(entity.current_start * 1000)
          : null,

        currentPeriodEnd: entity.current_end
          ? new Date(entity.current_end * 1000)
          : null,

        metadata: context.webhook,
      },
      client,
    );

    /*
      Update user plan
    */
    const changed = await updateUserPlan(result.user_id, result.plan, client);

    /*
      Record billing event
    */
    await createBillingEvent(
      "SUBSCRIPTION_ACTIVATED",
      result.id,
      result.user_id,
      {
        plan: result.plan,
        updatedPlan: changed,
      },
      client,
    );

    billingLogger.info("Subscription activated", {
      subscriptionId: result.id,
      userId: result.user_id,
      plan: result.plan,
    });

    return result;
  });
}
