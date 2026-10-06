import { describe, expect, it } from "vitest";
import { getWooCommercePublishErrorStatus } from "@/app/api/commerce/woocommerce/publish/route";

describe("getWooCommercePublishErrorStatus", () => {
  it("maps ownership and resource misses to 404", () => {
    expect(getWooCommercePublishErrorStatus("CHANNEL_NOT_FOUND")).toBe(404);
    expect(getWooCommercePublishErrorStatus("LISTING_NOT_FOUND")).toBe(404);
  });

  it("maps replay and reconciliation conflicts to 409", () => {
    expect(getWooCommercePublishErrorStatus("LISTING_ALREADY_PUBLISHED")).toBe(409);
    expect(getWooCommercePublishErrorStatus("LISTING_IDEMPOTENCY_KEY_MISMATCH")).toBe(409);
    expect(getWooCommercePublishErrorStatus("PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION")).toBe(409);
  });

  it("keeps validation and provider errors at 400", () => {
    expect(getWooCommercePublishErrorStatus("INVALID_PROVIDER")).toBe(400);
    expect(getWooCommercePublishErrorStatus("IDEMPOTENCY_KEY_REQUIRED")).toBe(400);
  });
});
