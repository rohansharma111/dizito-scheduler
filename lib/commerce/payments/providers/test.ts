import {
  CommercePaymentProvider,
  CreatePaymentInput,
  CreateRefundInput,
  PaymentResult,
  RefundResult,
} from "./types";

export const testPaymentProvider: CommercePaymentProvider = {
  name: "test",

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<PaymentResult> {
    return {
      success: true,
      provider: "test",
      providerPaymentId: `test-payment-${input.idempotencyKey}`,
      status: "paid",
      amount: input.amount,
      currency: input.currency,
    };
  },

  async createRefund(
    input: CreateRefundInput,
  ): Promise<RefundResult> {
    return {
      success: true,
      provider: "test",
      providerRefundId: `test-refund-${input.idempotencyKey}`,
      status: "succeeded",
      amount: input.amount,
      currency: input.currency,
    };
  },
};