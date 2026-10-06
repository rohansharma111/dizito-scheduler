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
    const errorValue = value as { error: unknown; message?: unknown };
    return {
      operation,
      status: "failed",
      error: {
        code: String(errorValue.error),
        message: String(errorValue.message ?? errorValue.error),
        retryable: false,
        ambiguous: false,
      },
    };
  }

  const rawExternalId =
    value && typeof value === "object" && "externalId" in value
      ? (value as { externalId?: unknown }).externalId
      : undefined;
  const externalId =
    typeof rawExternalId === "string" || typeof rawExternalId === "number"
      ? String(rawExternalId)
      : null;

  return {
    operation,
    status: "succeeded",
    externalId,
    data: value as T,
  };
}

function invalidOperation(
  operation: "draft" | "publish" | "reconcile",
  expected: string,
) {
  return {
    operation,
    status: "failed" as const,
    error: {
      code: "INVALID_ADAPTER_OPERATION",
      message: `WooCommerce ${operation} adapter received a non-${expected} payload`,
      retryable: false,
      ambiguous: false,
    },
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
      return invalidOperation("draft", "draft");
    }

    return result(
      "draft",
      await prepareWooCommerceListingDraft(input.context.userId, {
        ...input.payload.input,
        channelId: input.context.channelId,
      }),
    );
  },

  async publish(
    input: CommerceProviderOperationInput<WooCommerceAdapterPayload> & {
      confirmLivePublish: true;
    },
  ) {
    if (input.payload.action !== "publish") {
      return invalidOperation("publish", "publish");
    }

    return result(
      "publish",
      await publishWooCommerceProduct(input.context.userId, {
        ...input.payload.input,
        channelId: input.context.channelId,
        confirmLivePublish: true,
        idempotencyKey: input.idempotencyKey ?? input.payload.input.idempotencyKey,
      }),
    );
  },

  async reconcilePublish(
    input: CommerceProviderOperationInput<WooCommerceAdapterPayload> & {
      externalId?: string;
      lookupKey?: string;
    },
  ) {
    if (input.payload.action !== "reconcile") {
      return invalidOperation("reconcile", "reconcile");
    }

    return result(
      "reconcile",
      await reconcileWooCommercePublish(input.context.userId, {
        ...input.payload.input,
        channelId: input.context.channelId,
        externalId: input.externalId ?? input.payload.input.externalId,
        sku: input.lookupKey ?? input.payload.input.sku,
      }),
    );
  },
};
