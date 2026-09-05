import { CreatePaymentInput, PaymentResult } from "./types";
import { getCommercePaymentProvider } from "./registry";
import { createPaymentRecord } from "./service";

export interface ProcessPaymentInput extends CreatePaymentInput {
  userId: number;
  provider: string;
}

export async function processCommercePayment(
  input: ProcessPaymentInput,
): Promise<PaymentResult> {
  const provider = getCommercePaymentProvider(input.provider);

  // Call the external payment provider.
  const providerResult = await provider.createPayment({
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
  });

  // Provider failed — don't create a paid payment record.
  if (!providerResult.success) {
    return providerResult;
  }

  // Persist the provider result.
  const payment = await createPaymentRecord({
    userId: input.userId,
    orderId: input.orderId,
    provider: providerResult.provider,
    paymentMethod: input.paymentMethod,
    transactionId: providerResult.providerPaymentId,
    amount: providerResult.amount,
    currency: providerResult.currency,
    status: providerResult.status,
    idempotencyKey: input.idempotencyKey,
    paidAt: providerResult.status === "paid" ? new Date() : undefined,
  });

  return {
    success: true,
    provider: payment.provider,
    providerPaymentId: payment.transaction_id ?? undefined,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
  };
}
