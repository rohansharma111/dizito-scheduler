import { createRazorpayOrder } from "./client";

import { attachProviderOrder, createPaymentAttempt } from "../../service";

export interface CreateRazorpayCommercePaymentInput {
  userId: number;
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod?: string;
  idempotencyKey: string;
}

export async function createRazorpayCommercePayment(
  input: CreateRazorpayCommercePaymentInput,
) {
  /*
   * Step 1:
   * Create the local Dizito payment attempt first.
   *
   * This reserves the idempotency key before
   * communicating with Razorpay.
   */
  const payment = await createPaymentAttempt({
    userId: input.userId,
    orderId: input.orderId,
    provider: "razorpay",
    paymentMethod: input.paymentMethod,
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
  });

  /*
   * If this idempotency key already exists and
   * already has a Razorpay order, return it.
   */
  if (payment.provider_order_id) {
    return {
      success: true,
      payment,
    };
  }

  /*
   * Step 2:
   * Create the Razorpay Order.
   */
  const razorpayOrder = await createRazorpayOrder({
    amount: payment.amount,
    currency: payment.currency,
    receipt: `dizito-${payment.order_id}-${payment.id}`,
  });

  /*
   * Step 3:
   * Attach the Razorpay Order ID to the
   * existing Dizito payment attempt.
   */
  const updatedPayment = await attachProviderOrder(
    Number(payment.id),
    input.userId,
    razorpayOrder.id,
  );

  return {
    success: true,
    payment: updatedPayment,
    razorpayOrder: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
    },
  };
}
