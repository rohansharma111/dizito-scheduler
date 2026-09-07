import type { CommerceWebhookAdapter } from "./types";
import { testWebhookAdapter } from "./providers/test";
import { razorpayCommerceWebhookAdapter } from "./providers/razorpay";

const adapters: Record<string, CommerceWebhookAdapter> = {
  test: testWebhookAdapter,
  razorpay: razorpayCommerceWebhookAdapter,
};

export function getCommerceWebhookAdapter(
  provider: string,
): CommerceWebhookAdapter {
  const adapter = adapters[provider];

  if (!adapter) {
    throw new Error(`Unsupported commerce payment provider: ${provider}`);
  }

  return adapter;
}
