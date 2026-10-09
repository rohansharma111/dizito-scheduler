import { describe, expect, it } from "vitest";
import { BILLING_PLAN_CODES } from "./catalog";
import {
  BILLING_SCHEMA_FALLBACK_ENTITLEMENTS,
  BILLING_SCHEMA_FALLBACK_PLANS,
  isMissingBillingRelation,
} from "./schema-compatibility";

describe("billing schema compatibility fallback", () => {
  it("keeps the fallback plan catalog aligned with the V1 plan codes", () => {
    expect(Object.keys(BILLING_SCHEMA_FALLBACK_PLANS).sort()).toEqual(
      [...BILLING_PLAN_CODES].sort(),
    );
    expect(BILLING_SCHEMA_FALLBACK_PLANS.growth.price_minor).toBe(79900);
    expect(BILLING_SCHEMA_FALLBACK_PLANS.growth.id).toBeNull();
  });

  it("preserves the Growth entitlement limits when canonical tables are unavailable", () => {
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["channels.social.max"]).toBe(10);
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["channels.commerce.max"]).toBe(2);
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["publishing.monthly.max"]).toBe(500);
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["ai.actions.monthly.max"]).toBe(250);
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["feature.strategist"]).toBe(true);
    expect(BILLING_SCHEMA_FALLBACK_ENTITLEMENTS.growth["feature.optimizer"]).toBe(false);
  });

  it("recognizes only missing canonical billing relations", () => {
    expect(
      isMissingBillingRelation({
        code: "42P01",
        message: 'relation "billing_plans" does not exist',
      }),
    ).toBe(true);
    expect(
      isMissingBillingRelation({
        code: "42P01",
        message: 'relation "billing_events" does not exist',
      }),
    ).toBe(false);
    expect(
      isMissingBillingRelation({
        code: "23505",
        message: 'duplicate key value violates unique constraint',
      }),
    ).toBe(false);
  });
});
