import { failPayment } from "../../lifecycle/failPayment";
import { RazorpayWebhookPayload } from "../../providers/razorpay-types";

function isRazorpayWebhookPayload(
  payload: Record<string, unknown>,
): payload is RazorpayWebhookPayload {
  return (
    typeof payload.event === "string" &&
    typeof payload.payload === "object" &&
    payload.payload !== null
  );
}

export async function paymentFailed(payload: Record<string, unknown>) {
  if (!isRazorpayWebhookPayload(payload)) {
    throw new Error("Invalid Razorpay payment failure webhook payload");
  }

  await failPayment(payload);
}
