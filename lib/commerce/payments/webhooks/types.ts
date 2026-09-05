export type CommerceWebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "refund.succeeded"
  | "refund.failed";

export interface NormalizedWebhookEvent {
  provider: string;
  providerEventId: string;
  eventType: CommerceWebhookEventType;

  paymentId?: number;
  refundId?: number;

  payload: unknown;
}

export interface CommerceWebhookAdapter {
  readonly provider: string;

  verifySignature(payload: string, signature: string): boolean;

  normalizeEvent(payload: unknown): NormalizedWebhookEvent;
}
