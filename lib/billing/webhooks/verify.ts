import crypto from "crypto";

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET missing");
  }

  const generated = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return generated === signature;
}
