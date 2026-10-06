import type {
  CommerceProviderAdapter,
  CommerceProviderOperationInput,
  CommerceProviderOperationResult,
} from "@/lib/commerce/providers/contracts";
import {
  commerceProviderAdapters,
  type CommerceProviderAdapterMap,
  type CommerceProviderName,
} from "@/lib/commerce/providers/registry";

export function getCommerceProviderAdapter(
  provider: CommerceProviderName,
): CommerceProviderAdapterMap[CommerceProviderName] {
  return commerceProviderAdapters[provider];
}

export function requireCommerceProviderAdapter(
  provider: string,
): CommerceProviderAdapter {
  const adapter = commerceProviderAdapters[provider as CommerceProviderName];
  if (!adapter) {
    throw new Error("COMMERCE_PROVIDER_NOT_SUPPORTED");
  }
  return adapter;
}

export async function prepareCommerceProviderDraft<TPayload, TResponse>(
  provider: string,
  input: CommerceProviderOperationInput<TPayload>,
): Promise<CommerceProviderOperationResult<TResponse>> {
  return requireCommerceProviderAdapter(provider).prepareDraft(
    input as never,
  ) as Promise<CommerceProviderOperationResult<TResponse>>;
}
