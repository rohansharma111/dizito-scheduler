import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { orderService } from "@/lib/commerce/orders/service";

export async function PATCH(
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

    const body = await request.json();

    const newStatus = body?.status;

    if (
      newStatus !== "pending" &&
      newStatus !== "confirmed" &&
      newStatus !== "processing" &&
      newStatus !== "completed"
    ) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
      );
    }

    const result = await orderService.updateOrderStatus(
      Number(session.user.id),
      orderId,
      newStatus,
    );

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update order status",
      },
      { status: 400 },
    );
  }
}
