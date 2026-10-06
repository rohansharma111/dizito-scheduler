import type { CommerceProviderAdapter } from "@/lib/commerce/providers/contracts";
import {
  flipkartAdapter,
  type FlipkartAdapterPayload,
  type FlipkartAdapterResponse,
} from "@/lib/platforms/flipkart/adapter";
import {
  wooCommerceAdapter,
  type WooCommerceAdapterPayload,
  type WooCommerceAdapterResponse,
} from "@/lib/platforms/woocommerce/adapter";

export type CommerceProviderName = "flipkart" | "woocommerce";

export type CommerceProviderAdapterMap = {
  flipkart: CommerceProviderAdapter<FlipkartAdapterPayload, FlipkartAdapterResponse>;
  woocommerce: CommerceProviderAdapter<WooCommerceAdapterPayload, WooCommerceAdapterResponse>;
};

export const commerceProviderAdapters: CommerceProviderAdapterMap = {
  flipkart: flipkartAdapter,
  woocommerce: wooCommerceAdapter,
};

export function getCommerceProviderAdapter(
  provider: CommerceProviderName,
): CommerceProviderAdapterMap[CommerceProviderName] {
  return commerceProviderAdapters[provider];
}
