import { pool } from "@/lib/db";

export async function syncPaymentRefundStatus(paymentId: number) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `
      SELECT
        id,
        order_id,
        amount,
        currency,
        status
      FROM order_payments
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [paymentId],
    );

    if ((paymentResult.rowCount ?? 0) === 0) {
      throw new Error("Payment not found");
    }

    const payment = paymentResult.rows[0];

    const refundResult = await client.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total_refunded
      FROM order_refunds
      WHERE payment_id = $1::bigint
        AND status = 'succeeded'
      `,
      [paymentId],
    );

    const totalRefunded = Number(refundResult.rows[0].total_refunded);

    const paymentAmount = Number(payment.amount);

    let nextStatus = payment.status;

    if (totalRefunded >= paymentAmount) {
      nextStatus = "refunded";
    } else if (totalRefunded > 0) {
      nextStatus = "partially_refunded";
    } else if (
      payment.status === "partially_refunded" ||
      payment.status === "refunded"
    ) {
      nextStatus = "paid";
    }

    if (nextStatus !== payment.status) {
      await client.query(
        `
        UPDATE order_payments
        SET
          status = $1::varchar,
          updated_at = NOW()
        WHERE id = $2::bigint
        `,
        [nextStatus, paymentId],
      );
    }

    /*
     * Recalculate the order-level payment status
     * from all payments belonging to this order.
     */
    const orderPayments = await client.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN status IN (
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
      [payment.order_id],
    );

    const orderRefunds = await client.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total_refunded
      FROM order_refunds
      WHERE order_id = $1::bigint
        AND status = 'succeeded'
      `,
      [payment.order_id],
    );

    const totalPaid = Number(orderPayments.rows[0].total_paid);

    const totalOrderRefunded = Number(orderRefunds.rows[0].total_refunded);

    const orderResult = await client.query(
      `
      SELECT
        id,
        total
      FROM orders
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [payment.order_id],
    );

    if ((orderResult.rowCount ?? 0) === 0) {
      throw new Error("Order not found");
    }

    const orderTotal = Number(orderResult.rows[0].total);

    let orderPaymentStatus = "pending";

    if (totalOrderRefunded > 0 && totalOrderRefunded >= totalPaid) {
      orderPaymentStatus = "refunded";
    } else if (totalOrderRefunded > 0) {
      orderPaymentStatus = "partially_refunded";
    } else if (totalPaid >= orderTotal) {
      orderPaymentStatus = "paid";
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
      paymentId,
      paymentStatus: nextStatus,
      orderId: payment.order_id,
      orderPaymentStatus,
      totalRefunded,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
