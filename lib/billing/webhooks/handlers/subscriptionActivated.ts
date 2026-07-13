import { BillingRepository } from "../../repository";
import { activateSubscription } from "../../lifecycle/activateSubscription";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

export async function subscriptionActivated(payload: RazorpayWebhookPayload) {
  const entity = payload.payload.subscription.entity;

  const subscription = await BillingRepository.getSubscriptionByProviderId(
    entity.id,
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  await activateSubscription({
    subscription,

    webhook: payload,

    entity,

    event: "subscription.activated",
  });
}
