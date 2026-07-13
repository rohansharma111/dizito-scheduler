export type RazorpayWebhookEvent =
  | "subscription.authenticated"
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.pending"
  | "subscription.cancelled"
  | "subscription.completed"
  | "subscription.halted"
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed";
