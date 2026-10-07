import { describe, expect, it } from "vitest";
import { gracePeriodActive, mapRazorpaySubscriptionStatus } from "./state";

describe("billing subscription state mapping", () => {
  it("maps activation and charge events to active", () => {
    expect(mapRazorpaySubscriptionStatus("subscription.activated")).toBe("active");
    expect(mapRazorpaySubscriptionStatus("subscription.charged")).toBe("active");
  });

  it("maps halted subscriptions to grace period", () => {
    expect(mapRazorpaySubscriptionStatus("subscription.halted")).toBe("grace_period");
  });

  it("maps terminal subscription events", () => {
    expect(mapRazorpaySubscriptionStatus("subscription.cancelled")).toBe("cancelled");
    expect(mapRazorpaySubscriptionStatus("subscription.completed")).toBe("completed");
  });

  it("checks grace-period expiry deterministically", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(gracePeriodActive("2026-10-08T00:00:00Z", now)).toBe(true);
    expect(gracePeriodActive("2026-10-06T23:59:59Z", now)).toBe(false);
  });
});
