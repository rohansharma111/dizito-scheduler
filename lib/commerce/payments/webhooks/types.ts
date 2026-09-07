export type CommerceWebhookEventType =
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  | "order.paid"
  | "refund.processed"
  | "refund.failed";

export interface NormalizedWebhookEvent {
  provider: string;
  providerEventId: string;
  eventType: CommerceWebhookEventType;

  // Internal Dizito IDs
  paymentId?: number;
  refundId?: number;

  // Provider-side IDs
  providerPaymentId?: string;
  providerRefundId?: string;

  payload: unknown;
}

export interface CommerceWebhookAdapter {
  readonly provider: string;

  verifySignature(payload: string, signature: string): boolean;

  normalizeEvent(payload: unknown): Promise<NormalizedWebhookEvent>;
}
