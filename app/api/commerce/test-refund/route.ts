import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processCommerceRefund } from "@/lib/commerce/payments/refund-orchestrator";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      orderId,
      paymentId,
      amount,
      currency,
      provider,
      idempotencyKey,
      reason,
    } = body;

    const result = await processCommerceRefund({
      userId: Number(session.user.id),
      orderId: Number(orderId),
      paymentId: Number(paymentId),
      amount: Number(amount),
      currency,
      provider,
      idempotencyKey,
      reason,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test commerce refund error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Refund processing failed",
      },
      { status: 400 },
    );
  }
}
