import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { returnService } from "@/lib/commerce/orders/return-service";

interface RouteContext {
  params: Promise<{
    id: string;
    returnId: string;
  }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, returnId } = await context.params;

    const orderId = Number(id);
    const parsedReturnId = Number(returnId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!Number.isInteger(parsedReturnId) || parsedReturnId <= 0) {
      return NextResponse.json({ error: "Invalid return ID" }, { status: 400 });
    }

    const body = await request.json();

    const allowedStatuses = [
      "approved",
      "rejected",
      "cancelled",
      "in_transit",
      "received",
    ];

    if (
      typeof body.status !== "string" ||
      !allowedStatuses.includes(body.status)
    ) {
      return NextResponse.json(
        { error: "Invalid return status" },
        { status: 400 },
      );
    }

    const result = await returnService.updateReturnStatus(
      Number(session.user.id),
      parsedReturnId,
      body.status,
    );

    if (result.orderId !== orderId) {
      return NextResponse.json(
        { error: "Return does not belong to this order" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      return: result,
    });
  } catch (error) {
    console.error("Update return status error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update return status",
      },
      { status: 400 },
    );
  }
}
