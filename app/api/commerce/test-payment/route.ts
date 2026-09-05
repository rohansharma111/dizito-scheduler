import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processCommercePayment } from "@/lib/commerce/payments/orchestrator";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      orderId,
      amount,
      currency,
      paymentMethod,
      provider,
      idempotencyKey,
    } = body;

    const result = await processCommercePayment({
      userId: Number(session.user.id),
      orderId: Number(orderId),
      amount: Number(amount),
      currency,
      paymentMethod,
      provider,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test commerce payment error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Payment processing failed",
      },
      { status: 400 },
    );
  }
}
