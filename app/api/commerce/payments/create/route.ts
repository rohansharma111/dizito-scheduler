import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createRazorpayCommercePayment } from "@/lib/commerce/payments/providers/razorpay/payment-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const body = await request.json();

    const orderId = Number(body.orderId);

    const paymentMethod =
      typeof body.paymentMethod === "string"
        ? body.paymentMethod.trim()
        : undefined;

    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "idempotencyKey is required" },
        { status: 400 },
      );
    }

    if (idempotencyKey.length < 10) {
      return NextResponse.json(
        { error: "idempotencyKey must be at least 10 characters" },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "Invalid idempotencyKey format" },
        { status: 400 },
      );
    }

    /*
     * Load the order from the database.
     *
     * We intentionally do not trust the frontend for:
     * - amount
     * - currency
     * - ownership
     *
     * The order is the source of truth.
     */
    const orderResult = await pool.query(
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
        LIMIT 1
      `,
      [orderId, userId],
    );

    if ((orderResult.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderResult.rows[0];

    if (order.order_status === "cancelled") {
      return NextResponse.json(
        { error: "Cancelled orders cannot be paid" },
        { status: 400 },
      );
    }

    if (
      order.payment_status === "paid" ||
      order.payment_status === "refunded"
    ) {
      return NextResponse.json(
        { error: "Order does not have a payable balance" },
        { status: 400 },
      );
    }

    /*
     * Calculate how much has already been paid.
     *
     * Refunds are intentionally not subtracted here because
     * this endpoint is for creating a payment, not a refund.
     */
    const paidResult = await pool.query(
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
          ) AS total_paid
        FROM order_payments
        WHERE order_id = $1::bigint
      `,
      [orderId],
    );

    const totalPaid = Number(paidResult.rows[0]?.total_paid ?? 0);
    const orderTotal = Number(order.total);

    const remainingAmount = orderTotal - totalPaid;

    if (!Number.isSafeInteger(remainingAmount) || remainingAmount <= 0) {
      return NextResponse.json(
        { error: "Order does not have a payable balance" },
        { status: 400 },
      );
    }

    const amount = remainingAmount;

    const currency = String(order.currency ?? "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Order has an invalid currency" },
        { status: 400 },
      );
    }

    const result = await createRazorpayCommercePayment({
      userId,
      orderId,
      amount,
      currency,
      paymentMethod,
      idempotencyKey,
    });

    return NextResponse.json({
      ...result,
      order: {
        id: Number(order.id),
        total: orderTotal,
        currency,
        remainingAmount,
      },
    });
  } catch (error) {
    console.error("Commerce Razorpay payment creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Razorpay payment",
      },
      { status: 400 },
    );
  }
}
