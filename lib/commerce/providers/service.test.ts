import { describe, expect, it } from "vitest";

import {
  commerceProviderAdapters,
  getCommerceProviderAdapter as getRegisteredAdapter,
} from "@/lib/commerce/providers/registry";
import {
  getCommerceProviderAdapter,
  requireCommerceProviderAdapter,
} from "@/lib/commerce/providers/service";

describe("commerce provider registry", () => {
  it("registers WooCommerce as the first provider adapter", () => {
    expect(commerceProviderAdapters.woocommerce.provider).toBe("woocommerce");
    expect(getRegisteredAdapter("woocommerce")).toBe(commerceProviderAdapters.woocommerce);
    expect(getCommerceProviderAdapter("woocommerce")).toBe(commerceProviderAdapters.woocommerce);
  });

  it("rejects unsupported providers at the shared service boundary", () => {
    expect(() => requireCommerceProviderAdapter("unsupported")).toThrow(
      "COMMERCE_PROVIDER_NOT_SUPPORTED",
    );
  });
});
