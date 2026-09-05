import { pool } from "@/lib/db";
import { CommercePaymentStatus, CommerceRefundStatus } from "./types";

interface CreatePaymentRecordInput {
  userId: number;
  orderId: number;
  provider: string;
  paymentMethod?: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: CommercePaymentStatus;
  idempotencyKey: string;
  paidAt?: Date | null;
}

interface CreateRefundRecordInput {
  userId: number;
  orderId: number;
  paymentId: number;
  provider: string;
  providerRefundId?: string | null;
  amount: number;
  currency: string;
  status: CommerceRefundStatus;
  idempotencyKey: string;
  reason?: string | null;
  processedAt?: Date | null;
}

/**
 * Create an internal Commerce payment record.
 *
 * This does not call an external payment provider.
 * Provider execution belongs to the provider adapter.
 */
export async function createPaymentRecord(input: CreatePaymentRecordInput) {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new Error("Invalid order ID");
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  if (!input.provider?.trim()) {
    throw new Error("Payment provider is required");
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Currency must be a 3-letter uppercase code");
  }

  if (!input.idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingPayment = await client.query(
      `
  SELECT
    id,
    order_id,
    provider,
    payment_method,
    transaction_id,
    amount,
    currency,
    status,
    paid_at,
    idempotency_key,
    created_at,
    updated_at
  FROM order_payments
  WHERE idempotency_key = $1
  FOR UPDATE
  `,
      [input.idempotencyKey.trim()],
    );

    if ((existingPayment.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      return existingPayment.rows[0];
    }

    const orderResult = await client.query(
      `
      SELECT
        id,
        user_id,
        total,
        currency,
        payment_status
      FROM orders
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
      `,
      [input.orderId, input.userId],
    );

    if ((orderResult.rowCount ?? 0) === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    if (order.currency !== input.currency) {
      throw new Error("Payment currency does not match order currency");
    }

    const paidPaymentsResult = await client.query(
      `
  SELECT COALESCE(SUM(amount), 0) AS total_paid
  FROM order_payments
  WHERE order_id = $1
    AND status IN (
      'authorized',
      'paid',
      'refunded',
      'partially_refunded'
    )
  `,
      [input.orderId],
    );

    const totalPaid = Number(paidPaymentsResult.rows[0].total_paid);

    const remainingPayable = Number(order.total) - totalPaid;

    if (input.amount > remainingPayable) {
      throw new Error(
        `Payment amount exceeds remaining payable amount of ${remainingPayable}`,
      );
    }

    const paymentResult = await client.query(
      `
      INSERT INTO order_payments (
        order_id,
        provider,
        payment_method,
        transaction_id,
        amount,
        currency,
        status,
        paid_at,
        idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        order_id,
        provider,
        payment_method,
        transaction_id,
        amount,
        currency,
        status,
        paid_at,
        created_at,
        updated_at
      `,
      [
        input.orderId,
        input.provider.trim(),
        input.paymentMethod ?? null,
        input.transactionId ?? null,
        input.amount,
        input.currency,
        input.status,
        input.status === "paid" ? (input.paidAt ?? new Date()) : null,
        input.idempotencyKey.trim(),
      ],
    );

    if (input.status === "paid") {
      await client.query(
        `
        UPDATE orders
        SET
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = $1
        `,
        [input.orderId],
      );
    }

    await client.query("COMMIT");

    return paymentResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create an internal Commerce refund record.
 *
 * This does not execute a provider refund.
 */
export async function createRefundRecord(input: CreateRefundRecordInput) {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new Error("Invalid order ID");
  }

  if (!Number.isInteger(input.paymentId) || input.paymentId <= 0) {
    throw new Error("Invalid payment ID");
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Refund amount must be greater than zero");
  }

  if (!input.provider?.trim()) {
    throw new Error("Refund provider is required");
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Currency must be a 3-letter uppercase code");
  }

  if (!input.idempotencyKey?.trim()) {
    throw new Error("Idempotency key is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Idempotency:
     * If the same refund request is retried, return the
     * existing refund instead of creating another one.
     */
    const existingRefund = await client.query(
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
      WHERE idempotency_key = $1
      FOR UPDATE
      `,
      [input.idempotencyKey.trim()],
    );

    if ((existingRefund.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      return existingRefund.rows[0];
    }

    const paymentResult = await client.query(
      `
      SELECT
        op.id,
        op.order_id,
        op.amount,
        op.currency,
        op.status,
        o.user_id,
        o.total,
        o.payment_status
      FROM order_payments op
      JOIN orders o
        ON o.id = op.order_id
      WHERE op.id = $1
        AND op.order_id = $2
        AND o.user_id = $3
      FOR UPDATE OF op, o
      `,
      [input.paymentId, input.orderId, input.userId],
    );

    if ((paymentResult.rowCount ?? 0) === 0) {
      throw new Error("Payment not found");
    }

    const payment = paymentResult.rows[0];

    if (payment.currency !== input.currency) {
      throw new Error("Refund currency does not match payment currency");
    }

    if (payment.status !== "paid" && payment.status !== "partially_refunded") {
      throw new Error(
        "Only paid or partially refunded payments can be refunded",
      );
    }

    /*
     * Calculate refunds already created for this payment.
     *
     * Failed/cancelled refunds do not consume refundable amount.
     */
    const refundedResult = await client.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total_refunded
      FROM order_refunds
      WHERE payment_id = $1
        AND status IN ('pending', 'processing', 'succeeded')
      `,
      [input.paymentId],
    );

    const totalRefunded = Number(refundedResult.rows[0].total_refunded);

    const remainingRefundable = Number(payment.amount) - totalRefunded;

    if (input.amount > remainingRefundable) {
      throw new Error(
        `Refund amount exceeds refundable amount of ${remainingRefundable}`,
      );
    }

    const refundResult = await client.query(
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
        reason,
        processed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        input.provider.trim(),
        input.providerRefundId ?? null,
        input.amount,
        input.currency,
        input.status,
        input.idempotencyKey.trim(),
        input.reason ?? null,
        input.processedAt ?? null,
      ],
    );

    await client.query("COMMIT");

    return refundResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
