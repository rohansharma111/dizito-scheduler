import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { orderService } from "@/lib/commerce/orders/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const result = await orderService.cancelOrder(
      Number(session.user.id),
      orderId,
    );

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to cancel order",
      },
      { status: 400 },
    );
  }
}
