import { SubscriptionStatus } from "./types";

export function mapRazorpaySubscriptionStatus(
  event: string,
): SubscriptionStatus {
  switch (event) {
    case "subscription.authenticated":
      return "authenticated";
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.resumed":
      return "active";
    case "subscription.pending":
      return "pending";
    case "subscription.paused":
      return "paused";
    case "subscription.halted":
      return "grace_period";
    case "subscription.cancelled":
      return "cancelled";
    case "subscription.completed":
      return "completed";
    default:
      return "created";
  }
}

export function gracePeriodActive(
  gracePeriodUntil: Date | string | null | undefined,
  now = new Date(),
) {
  if (!gracePeriodUntil) return false;
  return new Date(gracePeriodUntil).getTime() > now.getTime();
}
