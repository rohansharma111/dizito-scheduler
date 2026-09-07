import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createRazorpayCommercePayment } from "@/lib/commerce/payments/providers/razorpay/payment-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const orderId = Number(body.orderId);
    const amount = Number(body.amount);

    const currency =
      typeof body.currency === "string" ? body.currency.toUpperCase() : "";

    const paymentMethod =
      typeof body.paymentMethod === "string" ? body.paymentMethod : undefined;

    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "idempotencyKey is required" },
        { status: 400 },
      );
    }

    const result = await createRazorpayCommercePayment({
      userId: Number(session.user.id),
      orderId,
      amount,
      currency,
      paymentMethod,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Commerce Razorpay payment creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Razorpay payment",
      },
      { status: 400 },
    );
  }
}
