export type WooCommercePublishAttemptStatus = "started" | "succeeded" | "failed" | "ambiguous";

export type WooCommercePublishAttemptDecision =
  | { action: "replay"; externalId: string }
  | { action: "reconcile" }
  | { action: "reserve" };

export function decideWooCommercePublishAttempt(
  status: WooCommercePublishAttemptStatus | null,
  externalId: string | null,
): WooCommercePublishAttemptDecision {
  if (status === "succeeded" && externalId) {
    return { action: "replay", externalId };
  }

  if (status === "started" || status === "ambiguous") {
    return { action: "reconcile" };
  }

  return { action: "reserve" };
}
