import { BillingRepository } from "../../repository";
import { createSubscriptionLifecycle } from "../../lifecycle/createSubscription";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

export async function subscriptionCreated(payload: RazorpayWebhookPayload) {
  const entity = payload.payload.subscription.entity;

  const subscription = await BillingRepository.getSubscriptionByProviderId(
    entity.id,
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  await createSubscriptionLifecycle({
    subscription,

    webhook: payload,

    entity,

    event: "subscription.authenticated",
  });
}
