import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  PaymentState,
  transitionPaymentStatus,
} from "@/lib/commerce/payments/state";

const paymentStates: PaymentState[] = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
];

function isPaymentState(value: unknown): value is PaymentState {
  return (
    typeof value === "string" && paymentStates.includes(value as PaymentState)
  );
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const paymentId = Number(body.paymentId);
    const nextStatus = body.nextStatus;

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json({ error: "Invalid paymentId" }, { status: 400 });
    }

    if (!isPaymentState(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 },
      );
    }

    const payment = await transitionPaymentStatus(paymentId, nextStatus);

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Test payment status error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment status transition failed",
      },
      { status: 400 },
    );
  }
}
