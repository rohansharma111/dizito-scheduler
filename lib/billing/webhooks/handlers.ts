import { billingWebhookHandlers } from "./handlers/registry";
import { RazorpayWebhookEvent } from "./types";
import { RazorpayWebhookPayload } from "../providers/razorpay-types";

export async function handleWebhookEvent(
  event: RazorpayWebhookEvent,
  payload: RazorpayWebhookPayload,
) {
  const handler = billingWebhookHandlers[event];

  if (!handler) {
    console.log("Unhandled billing event:", event);
    return;
  }

  await handler(payload);
}
