import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { processRazorpayRefund } from "@/lib/commerce/payments/refund-service";

interface RouteContext {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
}

interface RefundRequestBody {
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string | null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, paymentId: paymentIdParam } = await context.params;

    const orderId = Number(id);
    const paymentId = Number(paymentIdParam);
    const userId = Number(session.user.id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 },
      );
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid user session" },
        { status: 401 },
      );
    }

    let body: RefundRequestBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const amount = Number(body.amount);
    const currency = String(body.currency ?? "")
      .trim()
      .toUpperCase();
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();

    const reason =
      body.reason === undefined || body.reason === null
        ? null
        : String(body.reason).trim();

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be a positive integer" },
        { status: 400 },
      );
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency key is required" },
        { status: 400 },
      );
    }

    /*
     * Razorpay requires refund idempotency keys to be at least
     * 10 characters and only allows letters, numbers,
     * hyphens, and underscores.
     */
    if (idempotencyKey.length < 10) {
      return NextResponse.json(
        {
          error: "Idempotency key must be at least 10 characters",
        },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
      return NextResponse.json(
        {
          error:
            "Idempotency key may contain only letters, numbers, hyphens, and underscores",
        },
        { status: 400 },
      );
    }

    /*
     * The payment/refund service performs the authoritative
     * order ownership, payment ownership, refund amount,
     * currency, and provider checks.
     */
    const result = await processRazorpayRefund({
      userId,
      orderId,
      paymentId,
      amount,
      currency,
      idempotencyKey,
      reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create order refund error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create refund";

    /*
     * Keep business validation errors as 400 rather than
     * exposing them as generic server errors.
     */
    const businessErrors = [
      "Order not found",
      "Payment not found",
      "Payment cannot be refunded",
      "Payment is not a Razorpay payment",
      "Refund amount exceeds remaining refundable amount",
      "Refund currency does not match payment currency",
      "No captured Razorpay payment attempt found for refund",
      "Cancelled orders cannot be refunded",
    ];

    const isBusinessError = businessErrors.some((errorText) =>
      message.startsWith(errorText),
    );

    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 400 : 500 },
    );
  }
}
