import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyRazorpayCommercePayment } from "@/lib/commerce/payments/providers/razorpay/verification-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const razorpayOrderId =
      typeof body.razorpay_order_id === "string"
        ? body.razorpay_order_id.trim()
        : "";

    const razorpayPaymentId =
      typeof body.razorpay_payment_id === "string"
        ? body.razorpay_payment_id.trim()
        : "";

    const razorpaySignature =
      typeof body.razorpay_signature === "string"
        ? body.razorpay_signature.trim()
        : "";

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        {
          error:
            "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        },
        { status: 400 },
      );
    }

    const result = await verifyRazorpayCommercePayment({
      userId: Number(session.user.id),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Razorpay Commerce payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify Razorpay payment",
      },
      { status: 400 },
    );
  }
}
