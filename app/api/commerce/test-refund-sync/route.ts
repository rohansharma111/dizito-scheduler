import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPaymentRefundStatus } from "@/lib/commerce/payments/refund-state";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const paymentId = Number(body.paymentId);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json({ error: "Invalid paymentId" }, { status: 400 });
    }

    const result = await syncPaymentRefundStatus(paymentId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Test refund sync error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Refund synchronization failed",
      },
      { status: 400 },
    );
  }
}
