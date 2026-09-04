import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const userId = Number(session.user.id);

    const orderResult = await pool.query(
      `
        SELECT
          o.id,
          o.order_number,
          o.source,
          o.customer_id,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.currency,
          o.subtotal,
          o.discount,
          o.shipping_fee,
          o.tax,
          o.total,
          o.payment_status,
          o.order_status,
          o.fulfillment_status,
          o.notes,
          o.created_at,
          o.updated_at
        FROM orders o
        WHERE o.id = $1
          AND o.user_id = $2
      `,
      [orderId, userId],
    );

    if (orderResult.rowCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `
        SELECT
          id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          quantity,
          unit_price,
          discount,
          tax,
          total,
          created_at
        FROM order_items
        WHERE order_id = $1
        ORDER BY id ASC
      `,
      [orderId],
    );

    const addressesResult = await pool.query(
      `
        SELECT
          id,
          address_type,
          name,
          company,
          address_line_1,
          address_line_2,
          city,
          state,
          postal_code,
          country_code,
          phone,
          created_at
        FROM order_addresses
        WHERE order_id = $1
        ORDER BY
          CASE
            WHEN address_type = 'shipping' THEN 1
            WHEN address_type = 'billing' THEN 2
            ELSE 3
          END,
          id ASC
      `,
      [orderId],
    );

    const paymentsResult = await pool.query(
      `
        SELECT
          id,
          provider,
          payment_method,
          transaction_id,
          amount,
          currency,
          status,
          paid_at,
          created_at,
          updated_at
        FROM order_payments
        WHERE order_id = $1
        ORDER BY id ASC
      `,
      [orderId],
    );

    const shipmentsResult = await pool.query(
      `
        SELECT
          id,
          location_id,
          carrier,
          service,
          tracking_number,
          status,
          shipped_at,
          delivered_at,
          created_at,
          updated_at
        FROM order_shipments
        WHERE order_id = $1
        ORDER BY id ASC
      `,
      [orderId],
    );

    const returnsResult = await pool.query(
      `
        SELECT
          id,
          status,
          reason,
          customer_note,
          refund_amount,
          currency,
          requested_at,
          approved_at,
          received_at,
          completed_at,
          created_at,
          updated_at
        FROM order_returns
        WHERE order_id = $1
        ORDER BY id ASC
      `,
      [orderId],
    );

    const statusHistoryResult = await pool.query(
      `
        SELECT
          id,
          status_type,
          old_status,
          new_status,
          source,
          note,
          created_at
        FROM order_status_history
        WHERE order_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [orderId],
    );

    return NextResponse.json({
      order: {
        ...order,
        items: itemsResult.rows,
        addresses: addressesResult.rows,
        payments: paymentsResult.rows,
        shipments: shipmentsResult.rows,
        returns: returnsResult.rows,
        statusHistory: statusHistoryResult.rows,
      },
    });
  } catch (error) {
    console.error("Get order error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load order",
      },
      { status: 500 },
    );
  }
}
