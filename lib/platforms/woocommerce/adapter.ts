import type {
  CommerceProviderAdapter,
  CommerceProviderCapabilities,
  CommerceProviderOperationInput,
  CommerceProviderOperationResult,
} from "@/lib/commerce/providers/contracts";
import {
  prepareWooCommerceListingDraft,
  type PrepareWooCommerceDraftInput,
} from "@/lib/platforms/woocommerce/draft";
import {
  publishWooCommerceProduct,
  type PublishWooCommerceProductInput,
} from "@/lib/platforms/woocommerce/publish";
import {
  reconcileWooCommercePublish,
  type ReconcileWooCommercePublishInput,
} from "@/lib/platforms/woocommerce/reconcile";

export type WooCommerceAdapterPayload =
  | { action: "draft"; input: PrepareWooCommerceDraftInput }
  | { action: "publish"; input: PublishWooCommerceProductInput }
  | { action: "reconcile"; input: ReconcileWooCommercePublishInput };

export type WooCommerceAdapterResponse = Record<string, unknown>;

export const wooCommerceCapabilities: CommerceProviderCapabilities = {
  draft: true,
  publish: true,
  reconcile: true,
  sync: false,
  inventory: false,
  pricing: false,
  orders: false,
  returns: false,
  webhooks: false,
};

function result<T>(
  operation: "draft" | "publish" | "reconcile",
  value: unknown,
): CommerceProviderOperationResult<T> {
  if (value && typeof value === "object" && "error" in value) {
    return {
      operation,
      status: "failed",
      error: {
        code: String((value as { error: unknown }).error),
        message: String((value as { message?: unknown }).message ?? (value as { error: unknown }).error),
        retryable: false,
        ambiguous: false,
      },
    };
  }

  const externalId =
    value && typeof value === "object" && "externalId" in value
      ? String((value as { externalId: unknown }).externalId)
      : null;

  return {
    operation,
    status: "succeeded",
    externalId,
    data: value as T,
  };
}

export const wooCommerceAdapter: CommerceProviderAdapter<
  WooCommerceAdapterPayload,
  WooCommerceAdapterResponse
> = {
  provider: "woocommerce",
  capabilities: wooCommerceCapabilities,

  async prepareDraft(input: CommerceProviderOperationInput<WooCommerceAdapterPayload>) {
    if (input.payload.action !== "draft") {
      return {
        operation: "draft",
        status: "failed",
        error: {
          code: "INVALID_ADAPTER_OPERATION",
          message: "WooCommerce draft adapter received a non-draft payload",
          retryable: false,
          ambiguous: false,
        },
      };
    }

    return result(
      "draft",
      await prepareWooCommerceListingDraft(input.context.userId, input.payload.input),
    );
  },

  async publish(input: CommerceProviderOperationInput<WooCommerceAdapterPayload> & { confirmLivePublish: true }) {
    if (input.payload.action !== "publish") {
      return {
        operation: "publish",
        status: "failed",
        error: {
          code: "INVALID_ADAPTER_OPERATION",
          message: "WooCommerce publish adapter received a non-publish payload",
          retryable: false,
          ambiguous: false,
        },
      };
    }

    return result(
      "publish",
      await publishWooCommerceProduct(input.context.userId, {
        ...input.payload.input,
        confirmLivePublish: true,
        idempotencyKey: input.idempotencyKey ?? input.payload.input.idempotencyKey,
      }),
    );
  },

  async reconcilePublish(input: CommerceProviderOperationInput<WooCommerceAdapterPayload> & {
    externalId?: string;
    lookupKey?: string;
  }) {
    if (input.payload.action !== "reconcile") {
      return {
        operation: "reconcile",
        status: "failed",
        error: {
          code: "INVALID_ADAPTER_OPERATION",
          message: "WooCommerce reconciliation adapter received a non-reconcile payload",
          retryable: false,
          ambiguous: false,
        },
      };
    }

    return result(
      "reconcile",
      await reconcileWooCommercePublish(input.context.userId, {
        ...input.payload.input,
        externalId: input.externalId ?? input.payload.input.externalId,
        sku: input.lookupKey ?? input.payload.input.sku,
      }),
    );
  },
};
