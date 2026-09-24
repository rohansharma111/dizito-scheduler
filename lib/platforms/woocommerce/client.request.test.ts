import { afterEach, describe, expect, it, vi } from "vitest";
import { wooCommerceRequest } from "@/lib/platforms/woocommerce/client";

describe("wooCommerceRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends Basic authentication and JSON headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 123 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      wooCommerceRequest(
        {
          storeUrl: "https://store.example.com/",
          consumerKey: "ck_test",
          consumerSecret: "cs_test",
        },
        "products",
        { method: "POST", body: JSON.stringify({ name: "Demo" }) },
      ),
    ).resolves.toEqual({ id: 123 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://store.example.com/wp-json/wc/v3/products");
    expect(init.headers.get("Authorization")).toBe(
      `Basic ${Buffer.from("ck_test:cs_test").toString("base64")}`,
    );
    expect(init.headers.get("Accept")).toBe("application/json");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect(init.cache).toBe("no-store");
  });

  it("surfaces provider error messages from JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid API credentials" }), { status: 401 }),
      ),
    );

    await expect(
      wooCommerceRequest(
        {
          storeUrl: "https://store.example.com",
          consumerKey: "ck_test",
          consumerSecret: "cs_test",
        },
        "system_status",
      ),
    ).rejects.toThrow("Invalid API credentials");
  });

  it("rejects requests without credentials before calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      wooCommerceRequest(
        { storeUrl: "https://store.example.com", consumerKey: "", consumerSecret: "cs_test" },
        "system_status",
      ),
    ).rejects.toThrow("WooCommerce consumer key and consumer secret are required");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
