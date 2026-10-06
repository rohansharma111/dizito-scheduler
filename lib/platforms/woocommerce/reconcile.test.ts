import { describe, expect, it } from "vitest";
import { validateWooCommerceReconciliationIdentity } from "@/lib/platforms/woocommerce/reconcile";

describe("validateWooCommerceReconciliationIdentity", () => {
  it("requires a durable SKU identity when none is supplied", () => {
    expect(validateWooCommerceReconciliationIdentity({})).toEqual({
      error: "RECONCILIATION_IDENTITY_REQUIRED",
    });
  });

  it("accepts the listing SKU when the request omits one", () => {
    expect(
      validateWooCommerceReconciliationIdentity({ expectedSku: " SKU-123 " }),
    ).toEqual({ expectedSku: "SKU-123" });
  });

  it("rejects a requested SKU that conflicts with the listing SKU", () => {
    expect(
      validateWooCommerceReconciliationIdentity({
        requestedSku: "SKU-999",
        expectedSku: "SKU-123",
      }),
    ).toEqual({ error: "RECONCILIATION_SKU_MISMATCH" });
  });

  it("accepts matching requested and listing SKUs", () => {
    expect(
      validateWooCommerceReconciliationIdentity({
        requestedSku: " SKU-123 ",
        expectedSku: "SKU-123",
      }),
    ).toEqual({ expectedSku: "SKU-123" });
  });
});
