import { pool } from "@/lib/db";
import { CommercePaymentStatus, CommerceRefundStatus } from "./types";

interface CreatePaymentRecordInput {
  userId: number;
  orderId: number;
  provider: string;
  providerOrderId?: string;
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

export interface CreatePaymentAttemptInput {
  userId: number;
  orderId: number;
  provider: string;
  providerOrderId?: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput) {
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isSafeInteger(input.orderId) || input.orderId <= 0) {
    throw new Error("Invalid order ID");
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const currency = input.currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid payment currency");
  }

  const provider = input.provider.trim().toLowerCase();

  if (!provider) {
    throw new Error("Payment provider is required");
  }

  const idempotencyKey = input.idempotencyKey.trim();

  if (!idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Idempotency is checked before creating
     * another payment attempt.
     */
    const existingPayment = await client.query(
      `
        SELECT
          id,
          order_id,
          provider,
          provider_order_id,
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
      [idempotencyKey],
    );

    if ((existingPayment.rowCount ?? 0) > 0) {
      await client.query("COMMIT");

      return existingPayment.rows[0];
    }

    /*
     * Lock the order before creating the
     * payment attempt.
     */
    const orderResult = await client.query(
      `
        SELECT
          id,
          user_id,
          total,
          currency,
          payment_status,
          order_status
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

    if (String(order.currency).toUpperCase() !== currency) {
      throw new Error("Payment currency does not match order currency");
    }

    if (order.order_status === "cancelled") {
      throw new Error("Cannot create payment attempt for a cancelled order");
    }

    const paidResult = await client.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status IN (
                  'authorized',
                  'paid',
                  'partially_refunded',
                  'refunded'
                )
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS total_paid
        FROM order_payments
        WHERE order_id = $1::bigint
        `,
      [input.orderId],
    );

    const totalPaid = Number(paidResult.rows[0].total_paid);

    const orderTotal = Number(order.total);

    const remainingPayable = orderTotal - totalPaid;

    if (remainingPayable <= 0) {
      throw new Error("Order is already fully paid");
    }

    if (input.amount > remainingPayable) {
      throw new Error(
        `Payment amount exceeds remaining payable amount of ${remainingPayable}`,
      );
    }

    const result = await client.query(
      `
        INSERT INTO order_payments (
          order_id,
          provider,
          provider_order_id,
          payment_method,
          transaction_id,
          amount,
          currency,
          status,
          idempotency_key,
          paid_at
        )
        VALUES (
          $1::bigint,
          $2::varchar,
          $3,
          $4,
          NULL,
          $5,
          $6,
          'pending',
          $7,
          NULL
        )
        RETURNING
          id,
          order_id,
          provider,
          provider_order_id,
          payment_method,
          transaction_id,
          amount,
          currency,
          status,
          paid_at,
          idempotency_key,
          created_at,
          updated_at
        `,
      [
        input.orderId,
        provider,
        input.providerOrderId ?? null,
        input.paymentMethod ?? null,
        input.amount,
        currency,
        idempotencyKey,
      ],
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function attachProviderOrder(
  paymentId: number,
  userId: number,
  providerOrderId: string,
) {
  if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
    throw new Error("Invalid payment ID");
  }

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID");
  }

  const normalizedProviderOrderId = providerOrderId.trim();

  if (!normalizedProviderOrderId) {
    throw new Error("Provider order ID is required");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `
        SELECT
          op.id,
          op.order_id,
          op.provider,
          op.provider_order_id,
          op.status
        FROM order_payments op
        INNER JOIN orders o
          ON o.id = op.order_id
        WHERE op.id = $1::bigint
          AND o.user_id = $2::bigint
        FOR UPDATE
        `,
      [paymentId, userId],
    );

    if ((paymentResult.rowCount ?? 0) === 0) {
      throw new Error("Payment not found");
    }

    const payment = paymentResult.rows[0];

    if (
      payment.provider_order_id &&
      payment.provider_order_id !== normalizedProviderOrderId
    ) {
      throw new Error("Payment already has a different provider order ID");
    }

    const result = await client.query(
      `
        UPDATE order_payments
        SET
          provider_order_id = $1,
          updated_at = NOW()
        WHERE id = $2::bigint
        RETURNING
          id,
          order_id,
          provider,
          provider_order_id,
          payment_method,
          transaction_id,
          amount,
          currency,
          status,
          paid_at,
          idempotency_key,
          created_at,
          updated_at
        `,
      [normalizedProviderOrderId, paymentId],
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
    provider_order_id,
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
        provider_order_id, 
        payment_method,
        transaction_id,
        amount,
        currency,
        status,
        paid_at,
        idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        order_id,
        provider,
        provider_order_id,
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
        input.providerOrderId ?? null,
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
