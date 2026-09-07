import { fetchRazorpayPayment, verifyRazorpayPaymentSignature } from "./client";

import { pool } from "@/lib/db";

export interface VerifyRazorpayPaymentInput {
  userId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyRazorpayCommercePayment(
  input: VerifyRazorpayPaymentInput,
) {
  const razorpayOrderId = input.razorpayOrderId.trim();

  const razorpayPaymentId = input.razorpayPaymentId.trim();

  const razorpaySignature = input.razorpaySignature.trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Razorpay payment verification data is incomplete");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Find the Dizito payment using the Razorpay
     * Order ID. Never trust a browser-supplied
     * Dizito payment ID.
     */
    const paymentResult = await client.query(
      `
        SELECT
          op.id,
          op.order_id,
          op.provider,
          op.provider_order_id,
          op.transaction_id,
          op.amount,
          op.currency,
          op.status,
          op.payment_method,
          o.user_id
        FROM order_payments op
        INNER JOIN orders o
          ON o.id = op.order_id
        WHERE op.provider = 'razorpay'
          AND op.provider_order_id = $1
          AND o.user_id = $2::bigint
        FOR UPDATE
        `,
      [razorpayOrderId, input.userId],
    );

    if ((paymentResult.rowCount ?? 0) === 0) {
      throw new Error(
        "Razorpay payment order is not associated with this account",
      );
    }

    const payment = paymentResult.rows[0];

    if (String(payment.provider_order_id) !== razorpayOrderId) {
      throw new Error("Razorpay order ID mismatch");
    }

    /*
     * If the same payment has already been
     * recorded, return the current state safely.
     */
    if (
      payment.transaction_id === razorpayPaymentId &&
      (payment.status === "paid" ||
        payment.status === "partially_refunded" ||
        payment.status === "refunded")
    ) {
      await client.query("COMMIT");

      return {
        success: true,
        paymentId: Number(payment.id),
        orderId: Number(payment.order_id),
        providerOrderId: payment.provider_order_id,
        providerPaymentId: payment.transaction_id,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        alreadyVerified: true,
      };
    }

    const validSignature = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!validSignature) {
      throw new Error("Invalid Razorpay payment signature");
    }

    /*
     * Fetch the actual payment from Razorpay.
     * We don't trust the browser's claimed amount,
     * currency, order ID, or status.
     */
    const razorpayPayment = await fetchRazorpayPayment(razorpayPaymentId);

    if (razorpayPayment.order_id !== razorpayOrderId) {
      throw new Error("Razorpay payment does not belong to the expected order");
    }

    if (razorpayPayment.amount !== Number(payment.amount)) {
      throw new Error(
        "Razorpay payment amount does not match the Dizito payment amount",
      );
    }

    if (
      String(razorpayPayment.currency).toUpperCase() !==
      String(payment.currency).toUpperCase()
    ) {
      throw new Error(
        "Razorpay payment currency does not match the Dizito payment currency",
      );
    }

    if (razorpayPayment.status !== "captured") {
      throw new Error(
        `Razorpay payment is not captured (status: ${razorpayPayment.status})`,
      );
    }

    /*
     * Store the real Razorpay Payment ID.
     */
    const updateResult = await client.query(
      `
        UPDATE order_payments
        SET
          transaction_id = $1,
          status = 'paid',
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
        WHERE id = $2::bigint
        RETURNING
          id,
          order_id,
          provider,
          provider_order_id,
          transaction_id,
          amount,
          currency,
          status,
          payment_method,
          paid_at,
          idempotency_key,
          created_at,
          updated_at
        `,
      [razorpayPaymentId, payment.id],
    );

    /*
     * Update the order only after the payment has
     * been verified against Razorpay.
     */
    await client.query(
      `
      UPDATE orders
      SET
        payment_status = 'paid',
        updated_at = NOW()
      WHERE id = $1::bigint
      `,
      [payment.order_id],
    );

    await client.query("COMMIT");

    const updatedPayment = updateResult.rows[0];

    return {
      success: true,
      paymentId: Number(updatedPayment.id),
      orderId: Number(updatedPayment.order_id),
      providerOrderId: updatedPayment.provider_order_id,
      providerPaymentId: updatedPayment.transaction_id,
      status: updatedPayment.status,
      amount: Number(updatedPayment.amount),
      currency: updatedPayment.currency,
      alreadyVerified: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
