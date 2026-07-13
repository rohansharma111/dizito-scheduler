import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = body;

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return Response.json(
        {
          success: false,
          error: "Missing verification fields",
        },
        {
          status: 400,
        },
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error("RAZORPAY_KEY_SECRET not configured");
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    const verified = generatedSignature === razorpay_signature;

    if (!verified) {
      return Response.json(
        {
          success: false,
          error: "Signature verification failed",
        },
        {
          status: 400,
        },
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      {
        status: 500,
      },
    );
  }
}
