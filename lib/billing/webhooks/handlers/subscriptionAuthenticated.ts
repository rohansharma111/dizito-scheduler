import { BillingRepository } from "../../repository";
import { authenticateSubscriptionLifecycle } from "../../lifecycle/authenticateSubscription";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

export async function subscriptionAuthenticated(payload: RazorpayWebhookPayload) {
  const entity = payload.payload.subscription?.entity;

  if (!entity) {
    throw new Error(
      "Subscription authentication webhook does not contain a subscription",
    );
  }

  const subscription = await BillingRepository.getSubscriptionByProviderId(
    entity.id,
  );

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  await authenticateSubscriptionLifecycle({
    subscription,

    webhook: payload,

    entity,

    event: "subscription.authenticated",
  });
}
