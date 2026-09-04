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

export async function POST(request: Request, context: RouteContext) {
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

    const locationId = Number(body.locationId);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid inventory location ID" },
        { status: 400 },
      );
    }

    const result = await returnService.completeReturn(
      Number(session.user.id),
      parsedReturnId,
      locationId,
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
    console.error("Complete return error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to complete return",
      },
      { status: 400 },
    );
  }
}
