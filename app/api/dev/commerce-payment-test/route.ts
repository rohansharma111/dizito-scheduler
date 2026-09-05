import { NextResponse } from "next/server";
import { createPaymentRecord } from "@/lib/commerce/payments/service";

export async function POST() {
  try {
    const payment = await createPaymentRecord({
      userId: 8,
      orderId: 9,
      provider: "test",
      paymentMethod: "card",
      transactionId: "commerce-orch-test",
      amount: 1,
      currency: "INR",
      status: "paid",
      idempotencyKey: "commerce-orch-overpayment-001",
    });

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
