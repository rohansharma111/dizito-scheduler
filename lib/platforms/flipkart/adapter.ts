import type {
  CommerceProviderAdapter,
  CommerceProviderOperationResult,
} from "@/lib/commerce/providers/contracts";
import {
  executePreparedFlipkartPublish,
  prepareFlipkartListingPublish,
  type PrepareFlipkartPublishInput,
} from "@/lib/platforms/flipkart/publish";
import {
  prepareFlipkartListingDraft,
  type PrepareFlipkartListingDraftInput,
} from "@/lib/platforms/flipkart/draft";
import {
  reconcileFlipkartPublishOperation,
  type ReconcileFlipkartOperationInput,
} from "@/lib/platforms/flipkart/reconcile";

export type FlipkartAdapterPayload =
  | { action: "draft"; input: PrepareFlipkartListingDraftInput }
  | { action: "publish"; input: PrepareFlipkartPublishInput }
  | { action: "reconcile"; input: ReconcileFlipkartOperationInput };

export type FlipkartAdapterResponse =
  | Awaited<ReturnType<typeof prepareFlipkartListingDraft>>
  | Awaited<ReturnType<typeof prepareFlipkartListingPublish>>
  | Awaited<ReturnType<typeof executePreparedFlipkartPublish>>
  | Awaited<ReturnType<typeof reconcileFlipkartPublishOperation>>;

function failed(
  operation: "draft" | "publish" | "reconcile",
  code: string,
  message: string,
): CommerceProviderOperationResult<never> {
  return {
    operation,
    status: "failed",
    error: { code, message, retryable: false, ambiguous: false },
  };
}

export const flipkartAdapter: CommerceProviderAdapter<
  FlipkartAdapterPayload,
  FlipkartAdapterResponse
> = {
  provider: "flipkart",
  capabilities: {
    draft: true, publish: true, reconcile: true, sync: false,
    inventory: false, pricing: false, orders: false, returns: false, webhooks: false,
  },

  async prepareDraft({ context, payload }) {
    if (payload.action !== "draft") {
      return failed("draft", "INVALID_OPERATION_PAYLOAD", "Flipkart draft payload is required");
    }
    const result = await prepareFlipkartListingDraft(context.userId, {
      ...payload.input,
      channelId: context.channelId,
    });
    if ("error" in result) {
      return { operation: "draft", status: "failed", error: {
        code: result.error, message: result.error, retryable: false, ambiguous: false,
      }};
    }
    return { operation: "draft", status: "succeeded", data: result };
  },

  async publish({ context, payload }) {
    if (payload.action !== "publish") {
      return failed("publish", "INVALID_OPERATION_PAYLOAD", "Flipkart publish payload is required");
    }
    const prepared = await prepareFlipkartListingPublish(context.userId, {
      ...payload.input,
      channelId: context.channelId,
    });
    if ("error" in prepared) {
      return { operation: "publish", status: "failed", error: {
        code: prepared.error, message: prepared.error, retryable: false, ambiguous: false,
      }};
    }

    const existing = prepared.operation;
    if (existing.status === "succeeded") {
      return {
        operation: "publish",
        status: "succeeded",
        externalId: existing.external_id ?? undefined,
        data: { operation: existing, idempotentReplay: true },
      };
    }

    if (existing.status === "in_progress" || existing.status === "unknown") {
      return {
        operation: "publish",
        status: "ambiguous",
        data: { operation: existing, reconciliationRequired: true },
        error: {
          code: "RECONCILIATION_REQUIRED",
          message: "Flipkart publish operation already requires reconciliation",
          retryable: false,
          ambiguous: true,
        },
      };
    }

    const result = await executePreparedFlipkartPublish(context.userId, {
      channelId: context.channelId,
      operationId: existing.id,
      operation: existing.operation,
      payload: prepared.payload,
    });
    if (result.status === "disabled" || result.status === "OPERATION_NOT_FOUND") {
      return {
        operation: "publish",
        status: "failed",
        data: result,
        error: {
          code: result.status === "disabled" ? "LIVE_PUBLISH_DISABLED" : result.status,
          message: result.status === "disabled"
            ? "Flipkart live publishing is disabled"
            : "Flipkart publish operation was not found",
          retryable: false,
          ambiguous: false,
        },
      };
    }
    if (result.status === "failed") {
      return {
        operation: "publish",
        status: "failed",
        data: result,
        error: {
          code: "FLIPKART_PUBLISH_FAILED",
          message: "Flipkart publish failed",
          retryable: false,
          ambiguous: false,
        },
      };
    }
    return { operation: "publish", status: "ambiguous", data: result, error: {
      code: "RECONCILIATION_REQUIRED",
      message: "Flipkart publish requires reconciliation before success can be confirmed",
      retryable: false, ambiguous: true,
    }};
  },

  async reconcilePublish({ context, payload, externalId, lookupKey }) {
    if (payload.action !== "reconcile") {
      return failed(
        "reconcile",
        "INVALID_OPERATION_PAYLOAD",
        "Flipkart reconciliation payload is required",
      );
    }

    try {
      const result = await reconcileFlipkartPublishOperation(context.userId, {
        ...payload.input,
        channelId: context.channelId,
        ...(externalId ? { externalId } : {}),
        ...(lookupKey ? { lookupKey } : {}),
      });

      if (result.externalIdConfirmed && result.externalId) {
        return {
          operation: "reconcile",
          status: "succeeded",
          externalId: result.externalId,
          data: result,
        };
      }

      return {
        operation: "reconcile",
        status: "ambiguous",
        data: result,
        error: {
          code: "EXTERNAL_ID_CONFIRMATION_REQUIRED",
          message: "Flipkart reconciliation did not confirm an external listing ID",
          retryable: false,
          ambiguous: true,
        },
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "RECONCILIATION_FAILED";
      const deterministic = new Set([
        "CHANNEL_NOT_FOUND",
        "PUBLISH_ATTEMPT_NOT_FOUND",
        "PUBLISH_ATTEMPT_NOT_RECONCILABLE",
        "LISTING_EXTERNAL_ID_MISMATCH",
      ]);

      if (deterministic.has(code)) {
        return {
          operation: "reconcile",
          status: "failed",
          error: {
            code,
            message: code,
            retryable: false,
            ambiguous: false,
          },
        };
      }

      return {
        operation: "reconcile",
        status: "ambiguous",
        error: {
          code: "RECONCILIATION_FAILED",
          message: "Flipkart reconciliation could not confirm provider state",
          retryable: true,
          ambiguous: true,
        },
      };
    }
  },
};
