import { describe, expect, it } from "vitest";
import { decideWooCommercePublishAttempt } from "@/lib/platforms/woocommerce/publish-state";

describe("decideWooCommercePublishAttempt", () => {
  it("replays a completed attempt when an external id exists", () => {
    expect(decideWooCommercePublishAttempt("succeeded", "123")).toEqual({
      action: "replay",
      externalId: "123",
    });
  });

  it("requires reconciliation for a started attempt", () => {
    expect(decideWooCommercePublishAttempt("started", null)).toEqual({
      action: "reconcile",
    });
  });

  it("requires reconciliation for an ambiguous attempt", () => {
    expect(decideWooCommercePublishAttempt("ambiguous", null)).toEqual({
      action: "reconcile",
    });
  });

  it("allows failed attempts to be retried", () => {
    expect(decideWooCommercePublishAttempt("failed", null)).toEqual({
      action: "reserve",
    });
  });

  it("allows a missing attempt to be reserved", () => {
    expect(decideWooCommercePublishAttempt(null, null)).toEqual({
      action: "reserve",
    });
  });

  it("does not replay a succeeded attempt without an external id", () => {
    expect(decideWooCommercePublishAttempt("succeeded", null)).toEqual({
      action: "reserve",
    });
  });
});
