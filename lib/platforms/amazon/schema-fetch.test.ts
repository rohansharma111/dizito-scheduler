import { describe, expect, it, vi } from "vitest";

describe("Amazon product type schema fetch", () => {
  it("fetches HTTPS schema resources from the approved SP-API hosts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ properties: { sku: { type: "string" } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { fetchAmazonProductTypeSchema } = await import("./schema-fetch");
    await fetchAmazonProductTypeSchema({
      schema: {
        link: {
          resource: "https://sellingpartnerapi-na.amazon.com/definitions/2026-01-01/productTypes/example/schema",
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(URL);
    expect((fetchMock.mock.calls[0]?.[0] as URL).hostname).toBe("sellingpartnerapi-na.amazon.com");
    fetchMock.mockRestore();
  });

  it("rejects non-HTTPS and non-Amazon schema resources before network access", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const { fetchAmazonProductTypeSchema } = await import("./schema-fetch");

    await expect(
      fetchAmazonProductTypeSchema({
        schema: { link: { resource: "http://169.254.169.254/latest/meta-data/" } },
      }),
    ).rejects.toThrow("not an allowed Amazon SP-API resource");

    await expect(
      fetchAmazonProductTypeSchema({
        schema: { link: { resource: "https://attacker.example/schema.json" } },
      }),
    ).rejects.toThrow("not an allowed Amazon SP-API resource");

    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
