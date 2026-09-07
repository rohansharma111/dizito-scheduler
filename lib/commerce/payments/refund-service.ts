import { pool } from "@/lib/db";
import { createPendingRefund } from "./service";
import { createRazorpayRefund } from "./providers/razorpay/client";
import { syncPaymentRefundStatus } from "./refund-state";

export interface ProcessRazorpayRefundInput {
  userId: number;
  orderId: number;
  paymentId: number;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string | null;
}

export async function processRazorpayRefund(input: ProcessRazorpayRefundInput) {
  /*
   * Step 1:
   * Create or recover the durable local refund record.
   */
  const localResult = await createPendingRefund({
    userId: input.userId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    provider: "razorpay",
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
  });

  const refund = localResult.refund;

  /*
   * If this idempotency key already created a refund,
   * return the existing record.
   */
  if (!localResult.created) {
    return {
      success:
        refund.status === "pending" ||
        refund.status === "processing" ||
        refund.status === "succeeded",

      alreadyExists: true,
      refund,
    };
  }

  /*
   * Step 2:
   * Find the actual Razorpay payment ID.
   *
   * A logical Dizito payment can have multiple Razorpay
   * payment attempts. We refund the most recent captured
   * attempt.
   */
  const attemptResult = await pool.query(
    `
    SELECT
      id,
      provider_payment_id,
      amount,
      currency,
      status
    FROM order_payment_attempts
    WHERE payment_id = $1::bigint
      AND provider = 'razorpay'
      AND status IN ('captured', 'partially_refunded', 'refunded')
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [input.paymentId],
  );

  if ((attemptResult.rowCount ?? 0) === 0) {
    await pool.query(
      `
      UPDATE order_refunds
      SET
        status = 'failed',
        reason = 'No captured Razorpay payment attempt found',
        updated_at = NOW()
      WHERE id = $1::bigint
        AND status = 'pending'
      `,
      [refund.id],
    );

    throw new Error("No captured Razorpay payment attempt found for refund");
  }

  const attempt = attemptResult.rows[0];

  /*
   * Step 3:
   * Call Razorpay using EXACTLY the same idempotency key
   * stored in our database.
   */
  try {
    const razorpayRefund = await createRazorpayRefund({
      paymentId: attempt.provider_payment_id,
      amount: Number(refund.amount),
      idempotencyKey: refund.idempotency_key,
      notes: {
        dizito_refund_id: String(refund.id),
        dizito_order_id: String(input.orderId),
        dizito_payment_id: String(input.paymentId),
      },
    });

    let localStatus:
      | "pending"
      | "processing"
      | "succeeded"
      | "failed"
      | "cancelled";

    if (razorpayRefund.status === "processed") {
      localStatus = "succeeded";
    } else if (razorpayRefund.status === "failed") {
      localStatus = "failed";
    } else {
      localStatus = "processing";
    }

    /*
     * Step 4:
     * Persist Razorpay's refund ID and current status.
     */
    const updateResult = await pool.query(
      `
      UPDATE order_refunds
        SET
        provider_refund_id = $1::text,
        status = $2::varchar,
        processed_at =
            CASE
            WHEN $2::varchar = 'succeeded'
            THEN NOW()
            ELSE processed_at
            END,
        updated_at = NOW()
        WHERE id = $3::bigint
      RETURNING
        id,
        order_id,
        payment_id,
        provider,
        provider_refund_id,
        amount,
        currency,
        status,
        idempotency_key,
        reason,
        processed_at,
        created_at,
        updated_at
      `,
      [razorpayRefund.id, localStatus, refund.id],
    );

    /*
     * If Razorpay already says the refund is processed,
     * immediately synchronize payment/order state.
     *
     * Otherwise the webhook will eventually do it.
     */
    if (localStatus === "succeeded") {
      await syncPaymentRefundStatus(input.paymentId);
    }

    return {
      success: true,
      alreadyExists: false,
      refund: updateResult.rows[0],
      providerRefundId: razorpayRefund.id,
      providerStatus: localStatus,
    };
  } catch (error) {
    /*
     * IMPORTANT:
     *
     * We cannot always know whether Razorpay received the
     * refund request.
     *
     * For example:
     *
     *   Dizito → Razorpay → refund accepted → network timeout
     *
     * In that situation, marking the refund "failed" could
     * incorrectly tell the rest of the system that no money
     * movement occurred.
     *
     * Therefore an uncertain provider failure remains
     * "pending" and can be safely retried using the SAME
     * Razorpay idempotency key.
     */
    const message =
      error instanceof Error ? error.message : "Razorpay refund request failed";

    await pool.query(
      `
      UPDATE order_refunds
      SET
        status = 'pending'::varchar,
        reason = $1::text,
        updated_at = NOW()
      WHERE id = $2::bigint
        AND status IN ('pending', 'processing')
      `,
      [message, refund.id],
    );

    throw error;
  }
}
