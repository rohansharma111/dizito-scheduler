import { failPayment } from "../../lifecycle/failPayment";

export async function paymentFailed(payload: any) {
  await failPayment(payload);
}
