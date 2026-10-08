import { describe, expect, it } from "vitest";
import { LEGACY_PLAN_TO_V1, PUBLIC_BILLING_PLAN_CODES } from "./catalog";

describe("V1 billing catalog", () => {
  it("maps legacy Creator to Growth without retaining it as a V1 product code", () => {
    expect(LEGACY_PLAN_TO_V1.creator).toBe("growth");
    expect(LEGACY_PLAN_TO_V1.growth).toBe("growth");
    expect(LEGACY_PLAN_TO_V1.pro).toBe("pro");
    expect(LEGACY_PLAN_TO_V1.founding_beta).toBe("founding_beta");
    expect(PUBLIC_BILLING_PLAN_CODES).toEqual(["free", "growth", "pro"]);
    expect(PUBLIC_BILLING_PLAN_CODES).not.toContain("creator" as never);
  });

  it("keeps Agency as a future/non-public catalog plan", () => {
    expect(LEGACY_PLAN_TO_V1.agency).toBe("agency");
    expect(PUBLIC_BILLING_PLAN_CODES).not.toContain("agency" as never);
  });
});
