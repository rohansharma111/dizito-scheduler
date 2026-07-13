import { RazorpayWebhookEvent } from "../types";
import { subscriptionCreated } from "./subscriptionCreated";
import { subscriptionActivated } from "./subscriptionActivated";
import { paymentFailed } from "./paymentFailed";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

export const billingWebhookHandlers: Partial<
  Record<RazorpayWebhookEvent, (payload: RazorpayWebhookPayload) => Promise<void>>
> = {
  "subscription.created": subscriptionCreated,

  "subscription.activated": subscriptionActivated,

  "payment.failed": paymentFailed,
};
