import { CommercePaymentProvider } from "./providers/types";

import { testPaymentProvider } from "./providers/test";

import { razorpayCommerceProvider } from "./providers/razorpay/provider";

const providers = new Map<string, CommercePaymentProvider>([
  [testPaymentProvider.name, testPaymentProvider],
  [razorpayCommerceProvider.name, razorpayCommerceProvider],
]);

export function getCommercePaymentProvider(
  providerName: string,
): CommercePaymentProvider {
  const provider = providers.get(providerName);

  if (!provider) {
    throw new Error(
      `Commerce payment provider "${providerName}" is not configured`,
    );
  }

  return provider;
}
