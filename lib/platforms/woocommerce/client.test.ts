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


import { afterEach, vi } from "vitest";

const dnsMocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: dnsMocks.lookup }));

import {
  createWooCommerceProduct,
  findWooCommerceProductsBySku,
  getWooCommerceProduct,
  wooCommerceRequest,
} from "@/lib/platforms/woocommerce/client";

const config = {
  storeUrl: "https://store.example.com",
  consumerKey: "ck_test_secret",
  consumerSecret: "cs_test_secret",
};

describe("WooCommerce HTTP provider contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a simple product with the WooCommerce REST contract", async () => {
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 101, name: "Demo product", sku: "DEMO-101", type: "simple" }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createWooCommerceProduct(config, {
      name: "Demo product", type: "simple", regular_price: "12.50", sku: "DEMO-101",
    })).resolves.toMatchObject({ id: 101, type: "simple" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://store.example.com/wp-json/wc/v3/products");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Demo product", type: "simple", regular_price: "12.50", sku: "DEMO-101",
    });
    expect(new Headers(init.headers).get("Authorization")).toMatch(/^Basic /);
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("looks up products by encoded external ID and SKU", async () => {
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 101, sku: "A/B" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 101, sku: "A/B" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWooCommerceProduct(config, "101/extra")).resolves.toMatchObject({ id: 101 });
    await expect(findWooCommerceProductsBySku(config, "A/B & C")).resolves.toEqual([{ id: 101, sku: "A/B" }]);

    expect(fetchMock.mock.calls[0][0]).toBe("https://store.example.com/wp-json/wc/v3/products/101%2Fextra");
    expect(fetchMock.mock.calls[1][0]).toBe("https://store.example.com/wp-json/wc/v3/products?sku=A%2FB%20%26%20C");
  });

  it("uses the REST query fallback only when the canonical endpoint returns 404", async () => {
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 101 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(wooCommerceRequest(config, "products/101")).resolves.toEqual({ id: 101 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("https://store.example.com/?rest_route=%2Fwc%2Fv3%2Fproducts%2F101");
  });

  it("sanitizes provider errors instead of exposing response bodies or credentials", async () => {
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "secret details", consumer_secret: "should-not-leak" }),
      { status: 401 },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(wooCommerceRequest(config, "products")).rejects.toThrow(
      "WooCommerce request failed (401) at https://store.example.com/wp-json/wc/v3/products",
    );
    await expect(wooCommerceRequest(config, "products")).rejects.not.toThrow("should-not-leak");
  });

  it("maps aborted provider requests to an explicit timeout error", async () => {
    dnsMocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(wooCommerceRequest(config, "products")).rejects.toThrow(
      "WooCommerce request timed out after 15000ms",
    );
  });
});
