import { CreateRefundInput, RefundResult } from "./types";
import { getCommercePaymentProvider } from "./registry";
import { createRefundRecord } from "./service";
import { syncPaymentRefundStatus } from "./refund-state";

export interface ProcessRefundInput extends CreateRefundInput {
  userId: number;
  provider: string;
}

export async function processCommerceRefund(
  input: ProcessRefundInput,
): Promise<RefundResult> {
  const provider = getCommercePaymentProvider(input.provider);

  // Call the external payment provider.
  const providerResult = await provider.createRefund({
    orderId: input.orderId,
    paymentId: input.paymentId,
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
  });

  // Provider failed — do not create a successful refund record.
  if (!providerResult.success) {
    return providerResult;
  }

  // Persist the provider result.
  const refund = await createRefundRecord({
    userId: input.userId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    provider: providerResult.provider,
    providerRefundId: providerResult.providerRefundId,
    amount: providerResult.amount,
    currency: providerResult.currency,
    status: providerResult.status,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    processedAt: providerResult.status === "succeeded" ? new Date() : undefined,
  });

  // Synchronize payment and order state
  // from the successful refund records.
  if (providerResult.status === "succeeded") {
    await syncPaymentRefundStatus(input.paymentId);
  }

  return {
    success: true,
    provider: refund.provider,
    providerRefundId: refund.provider_refund_id ?? undefined,
    status: refund.status,
    amount: refund.amount,
    currency: refund.currency,
  };
}
