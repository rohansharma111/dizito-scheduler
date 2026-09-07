import { pool } from "@/lib/db";
import type { PoolClient } from "pg";
import {
  createRazorpayRefund,
  fetchRazorpayRefund,
} from "./providers/razorpay/client";
import { syncPaymentRefundStatus } from "./refund-state";

type RefundStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface PrepareRazorpayRefundInput {
  userId: number;
  orderId: number;
  paymentId: number;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string | null;
}

export interface ProcessRazorpayRefundInput extends PrepareRazorpayRefundInput {}

interface RefundRow {
  id: number;
  order_id: number;
  payment_id: number;
  provider: string;
  provider_refund_id: string | null;
  amount: number;
  currency: string;
  status: RefundStatus;
  idempotency_key: string;
  reason: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function validateRefundInput(input: PrepareRazorpayRefundInput) {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new Error("Invalid order ID");
  }

  if (!Number.isInteger(input.paymentId) || input.paymentId <= 0) {
    throw new Error("Invalid payment ID");
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Refund amount must be greater than zero");
  }

  const currency = String(input.currency ?? "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid refund currency");
  }

  const idempotencyKey = String(input.idempotencyKey ?? "").trim();

  if (!idempotencyKey) {
    throw new Error("Refund idempotency key is required");
  }

  if (idempotencyKey.length < 10) {
    throw new Error("Refund idempotency key must be at least 10 characters");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
    throw new Error("Refund idempotency key contains invalid characters");
  }

  return {
    currency,
    idempotencyKey,
  };
}

/**
 * Creates the durable local refund record.
 *
 * IMPORTANT:
 * This function expects the caller to already own a transaction.
 *
 * It does NOT call Razorpay.
 */
export async function createPendingRazorpayRefundWithClient(
  client: PoolClient,
  input: PrepareRazorpayRefundInput,
) {
  const { currency, idempotencyKey } = validateRefundInput(input);

  /*
   * Verify order ownership and lock the order.
   */
  const orderResult = await client.query(
    `
    SELECT
      id,
      user_id,
      order_status,
      total,
      currency
    FROM orders
    WHERE id = $1::bigint
      AND user_id = $2::bigint
    FOR UPDATE
    `,
    [input.orderId, input.userId],
  );

  if ((orderResult.rowCount ?? 0) === 0) {
    throw new Error("Order not found");
  }

  const order = orderResult.rows[0];

  if (order.order_status === "cancelled") {
    throw new Error("Cancelled orders cannot be refunded");
  }

  if (String(order.currency).toUpperCase() !== currency) {
    throw new Error("Refund currency does not match order currency");
  }

  /*
   * Lock the logical payment.
   */
  const paymentResult = await client.query(
    `
    SELECT
      id,
      order_id,
      amount,
      currency,
      status,
      provider
    FROM order_payments
    WHERE id = $1::bigint
      AND order_id = $2::bigint
    FOR UPDATE
    `,
    [input.paymentId, input.orderId],
  );

  if ((paymentResult.rowCount ?? 0) === 0) {
    throw new Error("Payment not found");
  }

  const payment = paymentResult.rows[0];

  if (payment.provider !== "razorpay") {
    throw new Error("Payment is not a Razorpay payment");
  }

  if (!["paid", "partially_refunded", "refunded"].includes(payment.status)) {
    throw new Error(`Payment cannot be refunded from status ${payment.status}`);
  }

  if (String(payment.currency).toUpperCase() !== currency) {
    throw new Error("Refund currency does not match payment currency");
  }

  if (Number(payment.amount) <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  /*
   * Idempotency:
   *
   * Reusing the same local idempotency key returns the same
   * refund record instead of creating another one.
   */
  const existingResult = await client.query(
    `
    SELECT
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
    FROM order_refunds
    WHERE idempotency_key = $1::text
    FOR UPDATE
    `,
    [idempotencyKey],
  );

  if ((existingResult.rowCount ?? 0) > 0) {
    const existing = existingResult.rows[0];

    if (
      Number(existing.order_id) !== input.orderId ||
      Number(existing.payment_id) !== input.paymentId ||
      Number(existing.amount) !== input.amount ||
      String(existing.currency).toUpperCase() !== currency ||
      existing.provider !== "razorpay"
    ) {
      throw new Error(
        "Refund idempotency key was already used for a different refund",
      );
    }

    return {
      created: false,
      refund: existing as RefundRow,
    };
  }

  /*
   * Calculate already committed refund amount for this payment.
   *
   * pending + processing + succeeded all reserve refund capacity.
   */
  const refundTotalResult = await client.query(
    `
    SELECT
      COALESCE(SUM(amount), 0) AS total
    FROM order_refunds
    WHERE payment_id = $1::bigint
      AND status IN (
        'pending',
        'processing',
        'succeeded'
      )
    `,
    [input.paymentId],
  );

  const alreadyRefunded = Number(refundTotalResult.rows[0].total);
  const paymentAmount = Number(payment.amount);
  const remainingRefundable = paymentAmount - alreadyRefunded;

  if (input.amount > remainingRefundable) {
    throw new Error(
      `Refund amount exceeds remaining refundable payment amount (${remainingRefundable})`,
    );
  }

  /*
   * Create durable local refund.
   */
  const insertResult = await client.query(
    `
    INSERT INTO order_refunds (
      order_id,
      payment_id,
      provider,
      provider_refund_id,
      amount,
      currency,
      status,
      idempotency_key,
      reason
    )
    VALUES (
      $1::bigint,
      $2::bigint,
      'razorpay',
      NULL,
      $3::integer,
      $4::varchar,
      'pending',
      $5::text,
      $6::text
    )
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
    [
      input.orderId,
      input.paymentId,
      input.amount,
      currency,
      idempotencyKey,
      input.reason?.trim() || null,
    ],
  );

  if ((insertResult.rowCount ?? 0) === 0) {
    throw new Error("Failed to create refund record");
  }

  return {
    created: true,
    refund: insertResult.rows[0] as RefundRow,
  };
}

/**
 * Marks a local refund as processing before calling Razorpay.
 *
 * Keeping the record in "processing" means an application crash
 * does not lose the refund attempt.
 */
async function markRefundProcessing(refundId: number) {
  const result = await pool.query(
    `
    UPDATE order_refunds
    SET
      status = 'processing',
      updated_at = NOW()
    WHERE id = $1::bigint
      AND status IN ('pending', 'processing')
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
    [refundId],
  );

  if ((result.rowCount ?? 0) === 0) {
    const existing = await pool.query(
      `
      SELECT
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
      FROM order_refunds
      WHERE id = $1::bigint
      `,
      [refundId],
    );

    if ((existing.rowCount ?? 0) === 0) {
      throw new Error("Refund not found");
    }

    return existing.rows[0] as RefundRow;
  }

  return result.rows[0] as RefundRow;
}

/**
 * Executes an already-created local Razorpay refund.
 *
 * The local refund record must exist before this function is called.
 *
 * Razorpay is always called with the SAME idempotency key stored
 * on the refund record.
 */
export async function executeRazorpayRefund(refundId: number) {
  if (!Number.isSafeInteger(refundId) || refundId <= 0) {
    throw new Error("Invalid refund ID");
  }

  const refundResult = await pool.query(
    `
    SELECT
      r.id,
      r.order_id,
      r.payment_id,
      r.provider,
      r.provider_refund_id,
      r.amount,
      r.currency,
      r.status,
      r.idempotency_key,
      r.reason,
      r.processed_at,
      r.created_at,
      r.updated_at,
      o.user_id
    FROM order_refunds r
    INNER JOIN orders o
      ON o.id = r.order_id
    WHERE r.id = $1::bigint
    `,
    [refundId],
  );

  if ((refundResult.rowCount ?? 0) === 0) {
    throw new Error("Refund not found");
  }

  const refund = refundResult.rows[0];

  if (refund.provider !== "razorpay") {
    throw new Error("Refund is not a Razorpay refund");
  }

  /*
   * Terminal states require no provider call.
   */
  if (refund.status === "succeeded") {
    return {
      success: true,
      alreadyExists: true,
      refund,
    };
  }

  if (refund.status === "failed" || refund.status === "cancelled") {
    return {
      success: false,
      alreadyExists: true,
      refund,
    };
  }

  /*
   * If the provider refund ID already exists, prefer provider
   * reconciliation instead of creating another refund request.
   */
  if (refund.provider_refund_id) {
    return await reconcileRazorpayRefund(
      Number(refund.user_id),
      Number(refund.id),
    );
  }

  /*
   * Mark processing before the external call.
   */
  const processingRefund = await markRefundProcessing(Number(refund.id));

  /*
   * Find a captured Razorpay payment attempt.
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
      AND status IN (
        'captured',
        'partially_refunded',
        'refunded'
      )
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [processingRefund.payment_id],
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
        AND status IN ('pending', 'processing')
      `,
      [processingRefund.id],
    );

    throw new Error("No captured Razorpay payment attempt found for refund");
  }

  const attempt = attemptResult.rows[0];

  if (
    String(attempt.currency).toUpperCase() !==
    String(processingRefund.currency).toUpperCase()
  ) {
    throw new Error(
      "Razorpay payment attempt currency does not match refund currency",
    );
  }

  /*
   * External provider operation.
   *
   * The transaction is NOT held open.
   */
  try {
    const razorpayRefund = await createRazorpayRefund({
      paymentId: attempt.provider_payment_id,
      amount: Number(processingRefund.amount),
      idempotencyKey: processingRefund.idempotency_key,
      notes: {
        dizito_refund_id: String(processingRefund.id),
        dizito_order_id: String(processingRefund.order_id),
        dizito_payment_id: String(processingRefund.payment_id),
      },
    });

    let localStatus: RefundStatus;

    if (razorpayRefund.status === "processed") {
      localStatus = "succeeded";
    } else if (razorpayRefund.status === "failed") {
      localStatus = "failed";
    } else {
      localStatus = "processing";
    }

    const updateResult = await pool.query(
      `
      UPDATE order_refunds
      SET
        provider_refund_id = $1::text,
        status = $2::varchar,
        processed_at =
          CASE
            WHEN $2::varchar = 'succeeded'
            THEN COALESCE(processed_at, NOW())
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
      [razorpayRefund.id, localStatus, processingRefund.id],
    );

    if ((updateResult.rowCount ?? 0) === 0) {
      throw new Error("Refund could not be updated");
    }

    if (localStatus === "succeeded") {
      await syncPaymentRefundStatus(Number(processingRefund.payment_id));
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
     * Do NOT mark an ambiguous provider/network failure as failed.
     *
     * The refund remains processing and can be retried with the
     * EXACT SAME Razorpay idempotency key.
     */
    const message =
      error instanceof Error ? error.message : "Razorpay refund request failed";

    await pool.query(
      `
      UPDATE order_refunds
      SET
        status = 'processing',
        reason = $1::text,
        updated_at = NOW()
      WHERE id = $2::bigint
        AND status IN ('pending', 'processing')
      `,
      [message, processingRefund.id],
    );

    throw error;
  }
}

/**
 * Backwards-compatible orchestration function.
 *
 * Used by normal payment refund routes that do not have a return
 * transaction to atomically link.
 */
export async function processRazorpayRefund(input: ProcessRazorpayRefundInput) {
  const client = await pool.connect();

  let refundId: number;

  try {
    await client.query("BEGIN");

    const localResult = await createPendingRazorpayRefundWithClient(
      client,
      input,
    );

    refundId = Number(localResult.refund.id);

    await client.query("COMMIT");

    /*
     * If the local refund already existed, execute it only when
     * it is still recoverable.
     */
    if (!localResult.created) {
      if (localResult.refund.status === "succeeded") {
        return {
          success: true,
          alreadyExists: true,
          refund: localResult.refund,
        };
      }

      if (
        localResult.refund.status === "failed" ||
        localResult.refund.status === "cancelled"
      ) {
        return {
          success: false,
          alreadyExists: true,
          refund: localResult.refund,
        };
      }
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw error;
  } finally {
    client.release();
  }

  return executeRazorpayRefund(refundId);
}

/**
 * Reconcile a local refund with Razorpay.
 *
 * This is safe to run after:
 * - webhook processing
 * - application crash
 * - network timeout
 * - manual recovery
 */
export async function reconcileRazorpayRefund(
  userId: number,
  refundId: number,
) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isSafeInteger(refundId) || refundId <= 0) {
    throw new Error("Invalid refund ID");
  }

  const localResult = await pool.query(
    `
    SELECT
      r.id,
      r.order_id,
      r.payment_id,
      r.provider,
      r.provider_refund_id,
      r.amount,
      r.currency,
      r.status,
      r.idempotency_key
    FROM order_refunds r
    INNER JOIN orders o
      ON o.id = r.order_id
    WHERE r.id = $1::bigint
      AND o.user_id = $2::bigint
    `,
    [refundId, userId],
  );

  if ((localResult.rowCount ?? 0) === 0) {
    throw new Error("Refund not found");
  }

  const localRefund = localResult.rows[0];

  if (localRefund.provider !== "razorpay") {
    throw new Error("Refund is not a Razorpay refund");
  }

  if (!localRefund.provider_refund_id) {
    throw new Error("Refund does not have a Razorpay refund ID");
  }

  const razorpayRefund = await fetchRazorpayRefund(
    localRefund.provider_refund_id,
  );

  let nextStatus: RefundStatus;

  switch (razorpayRefund.status) {
    case "processed":
      nextStatus = "succeeded";
      break;

    case "failed":
      nextStatus = "failed";
      break;

    case "pending":
    default:
      nextStatus = "processing";
      break;
  }

  const updateResult = await pool.query(
    `
    UPDATE order_refunds
    SET
      status = $1::varchar,
      processed_at =
        CASE
          WHEN $1::varchar = 'succeeded'
          THEN COALESCE(processed_at, NOW())
          ELSE processed_at
        END,
      updated_at = NOW()
    WHERE id = $2::bigint
      AND order_id = (
        SELECT id
        FROM orders
        WHERE id = order_refunds.order_id
          AND user_id = $3::bigint
      )
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
    [nextStatus, refundId, userId],
  );

  if ((updateResult.rowCount ?? 0) === 0) {
    throw new Error("Refund could not be updated");
  }

  if (nextStatus === "succeeded") {
    await syncPaymentRefundStatus(Number(localRefund.payment_id));
  }

  return {
    success: true,
    refund: updateResult.rows[0],
    providerStatus: razorpayRefund.status,
  };
}
