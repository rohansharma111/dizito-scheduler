import { createRazorpayRefund, fetchRazorpayPayment } from "./client";
import { createRefundRecord } from "../../service";
import type { CommerceRefundStatus } from "../../types";

export interface CreateRazorpayCommerceRefundInput {
  userId: number;
  orderId: number;
  paymentId: number;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
}

export async function createRazorpayCommerceRefund(
  input: CreateRazorpayCommerceRefundInput,
) {
  /*
   * First find the successful Razorpay payment attempt.
   *
   * We deliberately do NOT use order_payments.transaction_id,
   * because a payment can have multiple Razorpay payment attempts.
   */
  const paymentResult = await fetchPaymentForRefund(
    input.userId,
    input.orderId,
    input.paymentId,
  );

  const payment = paymentResult.payment;

  /*
   * Find the successful/captured Razorpay payment attempt.
   */
  const attemptResult = await fetchRazorpayPayment(payment.providerPaymentId);

  if (attemptResult.status !== "captured") {
    throw new Error(
      `Razorpay payment cannot be refunded from status ${attemptResult.status}`,
    );
  }

  if (attemptResult.amount !== payment.amount) {
    throw new Error(
      "Razorpay payment amount does not match the Dizito payment amount",
    );
  }

  if (
    String(attemptResult.currency).toUpperCase() !==
    String(payment.currency).toUpperCase()
  ) {
    throw new Error(
      "Razorpay payment currency does not match the Dizito payment currency",
    );
  }

  /*
   * Create the refund at Razorpay.
   *
   * Razorpay may initially return status = pending.
   * The refund.processed webhook will later move it to succeeded.
   */
  const razorpayRefund = await createRazorpayRefund({
    paymentId: payment.providerPaymentId,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    notes: {
      dizito_order_id: String(input.orderId),
      dizito_payment_id: String(input.paymentId),
      dizito_idempotency_key: input.idempotencyKey,
    },
  });

  const status = mapRazorpayRefundStatus(razorpayRefund.status);

  const refund = await createRefundRecord({
    userId: input.userId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    provider: "razorpay",
    providerRefundId: razorpayRefund.id,
    amount: razorpayRefund.amount,
    currency: razorpayRefund.currency,
    status,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason ?? null,
    processedAt: status === "succeeded" ? new Date() : null,
  });

  return {
    refund,
    razorpayRefund,
  };
}

function mapRazorpayRefundStatus(
  status: "pending" | "processed" | "failed",
): CommerceRefundStatus {
  switch (status) {
    case "pending":
      return "processing";

    case "processed":
      return "succeeded";

    case "failed":
      return "failed";

    default:
      throw new Error(`Unsupported Razorpay refund status: ${status}`);
  }
}

async function fetchPaymentForRefund(
  userId: number,
  orderId: number,
  paymentId: number,
) {
  const { pool } = await import("@/lib/db");

  const result = await pool.query(
    `
    SELECT
      op.id,
      op.order_id,
      op.amount,
      op.currency,
      op.status,
      o.user_id
    FROM order_payments op
    INNER JOIN orders o
      ON o.id = op.order_id
    WHERE op.id = $1::bigint
      AND op.order_id = $2::bigint
      AND o.user_id = $3::bigint
    LIMIT 1
    `,
    [paymentId, orderId, userId],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("Payment not found");
  }

  const payment = result.rows[0];

  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    throw new Error("Only paid or partially refunded payments can be refunded");
  }

  /*
   * Select the successful/captured provider attempt.
   *
   * The newest captured attempt is preferred because a payment
   * can have multiple Razorpay attempts.
   */
  const attemptResult = await pool.query(
    `
    SELECT
      id,
      provider_payment_id,
      amount,
      currency,
      status,
      created_at
    FROM order_payment_attempts
    WHERE payment_id = $1::bigint
      AND provider = 'razorpay'
      AND status = 'captured'
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [paymentId],
  );

  if ((attemptResult.rowCount ?? 0) === 0) {
    throw new Error(
      "No captured Razorpay payment attempt found for this payment",
    );
  }

  return {
    payment: {
      id: Number(payment.id),
      orderId: Number(payment.order_id),
      amount: Number(payment.amount),
      currency: String(payment.currency).toUpperCase(),
      status: payment.status,
      providerPaymentId: String(attemptResult.rows[0].provider_payment_id),
    },
  };
}
