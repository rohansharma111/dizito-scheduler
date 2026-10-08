import Razorpay from "razorpay";

let client: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay configuration is missing");
  }

  client = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return client;
}

/**
 * Lazily initialize Razorpay so Next.js build-time route analysis does not
 * require provider credentials. Credentials are still required when a billing
 * operation actually calls the provider.
 */
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, property, receiver) {
    return Reflect.get(getRazorpayClient(), property, receiver);
  },
});
