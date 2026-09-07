import { pool } from "@/lib/db";

export type PaymentState =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

const allowedTransitions: Record<PaymentState, PaymentState[]> = {
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "cancelled"],
  paid: ["partially_refunded", "refunded"],
  failed: ["paid"],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded"],
};

export async function transitionPaymentStatus(
  paymentId: number,
  nextStatus: PaymentState,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT
        id,
        order_id,
        status,
        amount,
        currency
      FROM order_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [paymentId],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new Error("Payment not found");
    }

    const payment = result.rows[0] as {
      id: number;
      order_id: number;
      status: PaymentState;
      amount: number;
      currency: string;
    };

    const currentStatus = payment.status;

    if (currentStatus === nextStatus) {
      await client.query("COMMIT");
      return payment;
    }

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new Error(
        `Invalid payment status transition: ${currentStatus} -> ${nextStatus}`,
      );
    }

    const updated = await client.query(
      `
  UPDATE order_payments
  SET
    status = $1::varchar,
    paid_at = CASE
      WHEN $1::varchar = 'paid' AND paid_at IS NULL
        THEN NOW()
      ELSE paid_at
    END,
    updated_at = NOW()
  WHERE id = $2::bigint
  RETURNING
    id,
    order_id,
    status,
    amount,
    currency,
    paid_at,
    updated_at
  `,
      [nextStatus, paymentId],
    );

    /*
     * Derive the order-level payment status from all payments
     * belonging to the order.
     */
    const paymentSummary = await client.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN status IN ('paid', 'partially_refunded', 'refunded')
                THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_paid,
        COALESCE(
          SUM(
            CASE
              WHEN status IN ('refunded', 'partially_refunded')
                THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_refunded
      FROM order_payments
      WHERE order_id = $1
      `,
      [payment.order_id],
    );

    const order = await client.query(
      `
      SELECT
        id,
        total,
        payment_status
      FROM orders
      WHERE id = $1
      FOR UPDATE
      `,
      [payment.order_id],
    );

    if ((order.rowCount ?? 0) === 0) {
      throw new Error("Order not found");
    }

    const orderData = order.rows[0];

    const totalPaid = Number(paymentSummary.rows[0].total_paid);
    const totalRefunded = Number(paymentSummary.rows[0].total_refunded);

    let orderPaymentStatus: PaymentState;

    if (totalRefunded >= totalPaid && totalPaid > 0) {
      orderPaymentStatus = "refunded";
    } else if (totalRefunded > 0) {
      orderPaymentStatus = "partially_refunded";
    } else if (totalPaid >= Number(orderData.total)) {
      orderPaymentStatus = "paid";
    } else {
      orderPaymentStatus = "pending";
    }

    await client.query(
      `
  UPDATE orders
  SET
    payment_status = $1::varchar,
    updated_at = NOW()
  WHERE id = $2::bigint
  `,
      [orderPaymentStatus, payment.order_id],
    );

    await client.query("COMMIT");

    return {
      ...updated.rows[0],
      orderPaymentStatus,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
