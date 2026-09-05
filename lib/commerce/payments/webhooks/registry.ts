import { CommerceWebhookAdapter } from "./types";
import { testWebhookAdapter } from "./providers/test";

const adapters = new Map<string, CommerceWebhookAdapter>([
  [testWebhookAdapter.provider, testWebhookAdapter],
]);

export function getCommerceWebhookAdapter(
  provider: string,
): CommerceWebhookAdapter {
  const adapter = adapters.get(provider);

  if (!adapter) {
    throw new Error(
      `Commerce webhook provider "${provider}" is not configured`,
    );
  }

  return adapter;
}
