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

interface RefundRequestBody {
  idempotencyKey: string;
  reason?: string | null;
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
    const userId = Number(session.user.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!Number.isInteger(parsedReturnId) || parsedReturnId <= 0) {
      return NextResponse.json({ error: "Invalid return ID" }, { status: 400 });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    let body: RefundRequestBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const idempotencyKey = String(body.idempotencyKey ?? "").trim();

    const reason =
      body.reason === undefined || body.reason === null
        ? null
        : String(body.reason).trim();

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Refund idempotency key is required" },
        { status: 400 },
      );
    }

    if (idempotencyKey.length < 10) {
      return NextResponse.json(
        {
          error: "Refund idempotency key must be at least 10 characters",
        },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
      return NextResponse.json(
        {
          error: "Refund idempotency key contains invalid characters",
        },
        { status: 400 },
      );
    }

    const result = await returnService.initiateReturnRefund(
      userId,
      parsedReturnId,
      idempotencyKey,
      reason,
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
    console.error("Initiate return refund error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to initiate return refund";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
