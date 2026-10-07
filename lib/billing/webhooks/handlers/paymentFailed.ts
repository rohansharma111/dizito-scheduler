import { failPayment } from "../../lifecycle/failPayment";

export async function paymentFailed(payload: Record<string, unknown>) {
  await failPayment(payload);
}
