export type BillingProvider = "razorpay";

export type SubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "paused"
  | "payment_failed"
  | "grace_period"
  | "cancelled"
  | "completed"
  | "expired";

export type BillingPlan = "creator" | "agency";
