import { RazorpayWebhookEvent } from "../types";
import { subscriptionAuthenticated } from "./subscriptionAuthenticated";
import { subscriptionActivated } from "./subscriptionActivated";
import { paymentFailed } from "./paymentFailed";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

export const billingWebhookHandlers: Partial<
  Record<RazorpayWebhookEvent, (payload: RazorpayWebhookPayload) => Promise<void>>
> = {
  "subscription.authenticated": subscriptionAuthenticated,

  "subscription.activated": subscriptionActivated,

  "payment.failed": paymentFailed,
};
