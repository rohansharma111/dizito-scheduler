import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prepareDraft: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/commerce/providers/service", () => ({
  prepareCommerceProviderDraft: mocks.prepareDraft,
}));

import { POST } from "@/app/api/commerce/flipkart/draft/route";

function request(body: unknown) {
  return new Request("http://localhost/api/commerce/flipkart/draft", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/commerce/flipkart/draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "7" } });
  });

  it("requires an authenticated session", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await POST(request({ channelId: "channel-1", product: {}, variants: [{ variantId: "v1" }] }));

    expect(response.status).toBe(401);
    expect(mocks.prepareDraft).not.toHaveBeenCalled();
  });

  it("validates channel and variants before provider dispatch", async () => {
    const response = await POST(request({ channelId: "channel-1", product: {}, variants: [] }));

    expect(response.status).toBe(400);
    expect(mocks.prepareDraft).not.toHaveBeenCalled();
  });

  it("dispatches through the provider service with session tenant context", async () => {
    mocks.prepareDraft.mockResolvedValue({
      status: "succeeded",
      data: {
        listing: { id: "listing-1" },
        mapping: { provider: "flipkart" },
        publishReady: false,
      },
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        product: { productId: "product-1", title: "Demo" },
        variants: [{ variantId: " v1 ", externalId: " EXT-1 " }],
        providerMetadata: { source: "test" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      listing: { id: "listing-1" },
      mapping: { provider: "flipkart" },
      publishReady: false,
    });
    expect(mocks.prepareDraft).toHaveBeenCalledWith("flipkart", {
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "draft",
        input: {
          channelId: "channel-1",
          product: { productId: "product-1", title: "Demo" },
          providerMetadata: { source: "test" },
          variants: [{ variantId: "v1", externalId: "EXT-1", providerMetadata: {} }],
        },
      },
    });
  });

  it("maps provider channel ownership failures to 404", async () => {
    mocks.prepareDraft.mockResolvedValue({
      status: "failed",
      error: { code: "CHANNEL_NOT_FOUND" },
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        product: { productId: "product-1" },
        variants: [{ variantId: "v1" }],
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "CHANNEL_NOT_FOUND",
    });
  });
});
