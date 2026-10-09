import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { wooCommerceRequest } from "@/lib/platforms/woocommerce/client";

describe("wooCommerceRequest", () => {
  beforeEach(() => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });
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

  it("does not surface provider-controlled error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid API credentials" }), { status: 401 }),
      ),
    );

    const error = await wooCommerceRequest(
      {
        storeUrl: "https://store.example.com",
        consumerKey: "ck_test",
        consumerSecret: "cs_test",
      },
      "system_status",
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("WooCommerce request failed (401)");
    expect((error as Error).message).not.toContain("Invalid API credentials");
  });

  it("rejects DNS resolutions into private networks before calling fetch", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      wooCommerceRequest(
        { storeUrl: "https://store.example.com", consumerKey: "ck_test", consumerSecret: "cs_test" },
        "system_status",
      ),
    ).rejects.toThrow("private or local network address");

    expect(fetchMock).not.toHaveBeenCalled();
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
