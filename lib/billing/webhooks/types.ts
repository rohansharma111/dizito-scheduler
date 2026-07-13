export type RazorpayWebhookEvent =
  | "subscription.created"
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.pending"
  | "subscription.cancelled"
  | "subscription.completed"
  | "subscription.halted"
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed";
