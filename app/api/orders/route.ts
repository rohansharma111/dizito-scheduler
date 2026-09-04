import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { orderService } from "@/lib/commerce/orders/service";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const order = await orderService.createOrder(Number(session.user.id), body);

    return NextResponse.json(
      {
        success: true,
        order,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create order",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const userId = Number(session.user.id);

    const values: unknown[] = [userId];
    const conditions = [`o.user_id = $1`];

    if (status) {
      values.push(status);
      conditions.push(`o.order_status = $${values.length}`);
    }

    if (source) {
      values.push(source);
      conditions.push(`o.source = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`
        (
          o.order_number ILIKE $${values.length}
          OR o.customer_name ILIKE $${values.length}
          OR o.customer_email ILIKE $${values.length}
          OR o.customer_phone ILIKE $${values.length}
        )
      `);
    }

    const result = await pool.query(
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
          o.created_at,
          o.updated_at,

          COALESCE(
            SUM(oi.quantity),
            0
          ) AS item_quantity,

          COUNT(oi.id) AS item_count

        FROM orders o

        LEFT JOIN order_items oi
          ON oi.order_id = o.id

        WHERE ${conditions.join(" AND ")}

        GROUP BY o.id

        ORDER BY o.created_at DESC

        LIMIT 100
      `,
      values,
    );

    return NextResponse.json({
      orders: result.rows,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load orders",
      },
      { status: 500 },
    );
  }
}
