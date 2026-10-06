import type { CommerceProviderAdapter } from "@/lib/commerce/providers/contracts";
import {
  wooCommerceAdapter,
  type WooCommerceAdapterPayload,
  type WooCommerceAdapterResponse,
} from "@/lib/platforms/woocommerce/adapter";

export type CommerceProviderName = "woocommerce";

export type CommerceProviderAdapterMap = {
  woocommerce: CommerceProviderAdapter<WooCommerceAdapterPayload, WooCommerceAdapterResponse>;
};

export const commerceProviderAdapters: CommerceProviderAdapterMap = {
  woocommerce: wooCommerceAdapter,
};

export function getCommerceProviderAdapter(
  provider: CommerceProviderName,
): CommerceProviderAdapterMap[CommerceProviderName] {
  return commerceProviderAdapters[provider];
}
