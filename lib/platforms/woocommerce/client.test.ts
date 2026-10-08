import { describe, expect, it } from "vitest";
import { normalizeWooCommerceStoreUrl } from "@/lib/platforms/woocommerce/client";

describe("normalizeWooCommerceStoreUrl", () => {
  it("trims whitespace and removes a trailing slash", () => {
    expect(normalizeWooCommerceStoreUrl("  https://store.example.com/  ")).toBe("https://store.example.com");
  });

  it("preserves a non-root path", () => {
    expect(normalizeWooCommerceStoreUrl("https://store.example.com/shop/")).toBe("https://store.example.com/shop");
  });

  it("accepts HTTP URLs", () => {
    expect(normalizeWooCommerceStoreUrl("http://localhost:8080/")).toBe("http://localhost:8080");
  });

  it("rejects credential-bearing URLs", () => {\n    expect(() => normalizeWooCommerceStoreUrl("https://user:pass@store.example.com")).toThrow("invalid");\n  });\n\n  it("rejects URLs without an HTTP scheme", () => {
    expect(() => normalizeWooCommerceStoreUrl("store.example.com")).toThrow(
      "WooCommerce store URL must start with http:// or https://",
    );
  });
});
