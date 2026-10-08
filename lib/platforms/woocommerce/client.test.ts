import { describe, expect, it } from "vitest";
import { normalizeWooCommerceStoreUrl } from "@/lib/platforms/woocommerce/client";

describe("normalizeWooCommerceStoreUrl", () => {
  it("trims whitespace and removes a trailing slash", () => {
    expect(normalizeWooCommerceStoreUrl("  https://store.example.com/  ")).toBe("https://store.example.com");
  });

  it("preserves a non-root path", () => {
    expect(normalizeWooCommerceStoreUrl("https://store.example.com/shop/")).toBe("https://store.example.com/shop");
  });

  it("rejects loopback and private destinations", () => {
    expect(() => normalizeWooCommerceStoreUrl("http://localhost:8080/")).toThrow("public host");
    expect(() => normalizeWooCommerceStoreUrl("http://127.0.0.1:8080/")).toThrow("public host");
    expect(() => normalizeWooCommerceStoreUrl("http://192.168.1.10/")).toThrow("public host");
  });

  it("rejects credential-bearing URLs", () => {
    expect(() => normalizeWooCommerceStoreUrl("https://user:pass@store.example.com")).toThrow("invalid");
  });

  it("rejects URLs without an HTTP scheme", () => {
    expect(() => normalizeWooCommerceStoreUrl("store.example.com")).toThrow(
      "WooCommerce store URL must start with http:// or https://",
    );
  });
});
