import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BillingRepository } from "@/lib/billing/repository";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return Response.json({ success: false, error: "Missing verification fields" }, { status: 400 });
    }

    const subscription = await BillingRepository.getSubscriptionByProviderId(
      razorpay_subscription_id,
    );
    if (!subscription || subscription.user_id !== Number((session.user as any).id)) {
      return Response.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("RAZORPAY_KEY_SECRET not configured");

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    const expected = Buffer.from(generatedSignature, "utf8");
    const received = Buffer.from(razorpay_signature, "utf8");
    const verified =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (!verified) {
      return Response.json({ success: false, error: "Signature verification failed" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
