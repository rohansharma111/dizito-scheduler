/**
 * Provider-neutral commerce operation contracts.
 *
 * Provider adapters own authentication, payload mapping, HTTP/API details, and
 * provider-specific identifiers. These types only define the boundary between
 * provider workflows and the Commerce OS orchestration layer.
 */

export type CommerceProviderOperation =
  | "draft"
  | "publish"
  | "reconcile"
  | "sync";

export type CommerceProviderOperationStatus =
  | "succeeded"
  | "failed"
  | "ambiguous";

export interface CommerceProviderCapabilities {
  draft: boolean;
  publish: boolean;
  reconcile: boolean;
  sync: boolean;
  inventory: boolean;
  pricing: boolean;
  orders: boolean;
  returns: boolean;
  webhooks: boolean;
}

/**
 * Safe, provider-neutral error information.
 *
 * Provider adapters may retain provider-specific diagnostics internally, but
 * orchestration code should only depend on this bounded contract.
 */
export interface CommerceProviderError {
  code: string;
  message: string;
  retryable: boolean;
  ambiguous: boolean;
}

export interface CommerceProviderOperationResult<T = unknown> {
  operation: CommerceProviderOperation;
  status: CommerceProviderOperationStatus;
  externalId?: string | null;
  data?: T;
  error?: CommerceProviderError;
}

/**
 * Context available to an adapter after the caller has authenticated the
 * merchant and established tenant ownership.
 *
 * Adapters must not use a caller-supplied user id to bypass channel ownership
 * checks. Channel lookup/authorization remains a shared-service concern.
 */
export interface CommerceProviderContext {
  channelId: string;
  userId: number;
}

/**
 * Provider-specific payloads deliberately remain opaque to the shared layer.
 * Mapping canonical Product/Variant data into this shape belongs to the
 * provider adapter.
 */
export interface CommerceProviderOperationInput<TPayload = unknown> {
  context: CommerceProviderContext;
  payload: TPayload;
  idempotencyKey?: string;
}

export interface CommerceProviderAdapter<TPayload = unknown, TResponse = unknown> {
  readonly provider: string;
  readonly capabilities: CommerceProviderCapabilities;

  prepareDraft(
    input: CommerceProviderOperationInput<TPayload>,
  ): Promise<CommerceProviderOperationResult<TResponse>>;

  publish(
    input: CommerceProviderOperationInput<TPayload> & {
      confirmLivePublish: true;
    },
  ): Promise<CommerceProviderOperationResult<TResponse>>;

  reconcilePublish(
    input: CommerceProviderOperationInput<TPayload> & {
      externalId?: string;
      lookupKey?: string;
    },
  ): Promise<CommerceProviderOperationResult<TResponse>>;
}
