import { afterEach, describe, expect, it, vi } from "vitest";

import {
  flipkartRequest,
  getFlipkartListings,
  type FlipkartClientConfig,
} from "@/lib/platforms/flipkart/client";

const config: FlipkartClientConfig = {
  accessToken: "sandbox-token",
  environment: "sandbox",
};

describe("Flipkart client contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the sandbox seller API and sends the bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ listings: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await flipkartRequest(config, "listings/v3/SKU-1");

    expect(result).toEqual({ listings: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox-api.flipkart.net/sellers/listings/v3/SKU-1",
      expect.objectContaining({
        cache: "no-store",
      }),
    );

    const request = fetchMock.mock.calls[0]?.[1];
    const headers = request?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer sandbox-token");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("encodes SKU identifiers and keeps the lookup bounded", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ listings: [] }), { status: 200 }),
    );

    await getFlipkartListings(config, [" SKU/1 ", "SKU 2"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox-api.flipkart.net/sellers/listings/v3/SKU%2F1,SKU%202",
      expect.any(Object),
    );

    await expect(
      getFlipkartListings(config, Array.from({ length: 11 }, (_, index) => `SKU-${index}`)),
    ).rejects.toThrow("between 1 and 10 SKU IDs");
  });

  it("fails closed when the access token is empty or expired", async () => {
    await expect(
      flipkartRequest({ ...config, accessToken: "   " }, "listings/v3/SKU-1"),
    ).rejects.toThrow("access token is required");

    await expect(
      flipkartRequest(
        {
          ...config,
          accessTokenExpiresAt: new Date(Date.now() - 1_000),
        },
        "listings/v3/SKU-1",
      ),
    ).rejects.toThrow("expired or nearing expiry");
  });

  it("does not treat a provider error response as a successful payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid request" }), { status: 400 }),
    );

    await expect(flipkartRequest(config, "listings/v3/SKU-1")).rejects.toThrow(
      "Flipkart request failed with status 400",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the production seller API only when explicitly configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );

    await flipkartRequest({ ...config, environment: "production" }, "listings/v3/SKU-1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.flipkart.net/sellers/listings/v3/SKU-1",
    );
  });
});
