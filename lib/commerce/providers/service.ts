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

export async function publishCommerceProvider<TPayload, TResponse>(
  provider: string,
  input: CommerceProviderOperationInput<TPayload> & { confirmLivePublish: true },
): Promise<CommerceProviderOperationResult<TResponse>> {
  const adapter = requireCommerceProviderAdapter(provider);
  if (!adapter.capabilities.publish) {
    return {
      operation: "publish",
      status: "failed",
      error: {
        code: "COMMERCE_OPERATION_NOT_SUPPORTED",
        message: `Provider ${provider} does not support publish`,
        retryable: false,
        ambiguous: false,
      },
    };
  }

  return adapter.publish(input as never) as Promise<CommerceProviderOperationResult<TResponse>>;
}

export async function reconcileCommerceProvider<TPayload, TResponse>(
  provider: string,
  input: CommerceProviderOperationInput<TPayload> & {
    externalId?: string;
    lookupKey?: string;
  },
): Promise<CommerceProviderOperationResult<TResponse>> {
  const adapter = requireCommerceProviderAdapter(provider);
  if (!adapter.capabilities.reconcile) {
    return {
      operation: "reconcile",
      status: "failed",
      error: {
        code: "COMMERCE_OPERATION_NOT_SUPPORTED",
        message: `Provider ${provider} does not support reconciliation`,
        retryable: false,
        ambiguous: false,
      },
    };
  }

  return adapter.reconcilePublish(input as never) as Promise<CommerceProviderOperationResult<TResponse>>;
}
