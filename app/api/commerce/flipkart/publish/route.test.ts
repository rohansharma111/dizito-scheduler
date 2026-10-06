import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/commerce/providers/service", () => ({
  publishCommerceProvider: mocks.publish,
}));

import {
  POST,
  getFlipkartPublishErrorStatus,
} from "@/app/api/commerce/flipkart/publish/route";

function request(body: unknown) {
  return new Request("http://localhost/api/commerce/flipkart/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const listing = {
  productId: "product-1",
  price: { mrp: 100, selling_price: 90, currency: "INR" },
};

describe("POST /api/commerce/flipkart/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "7" } });
  });

  it("requires explicit live-publish confirmation", async () => {
    const response = await POST(
      request({
        channelId: "channel-1",
        listingId: "listing-1",
        idempotencyKey: "request-1",
        confirmLivePublish: false,
        listing,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("dispatches the confirmed publish through the provider service", async () => {
    mocks.publish.mockResolvedValue({
      status: "ambiguous",
      data: { operationId: "operation-1" },
      externalId: undefined,
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        listingId: "listing-1",
        idempotencyKey: "request-1",
        confirmLivePublish: true,
        listing,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      status: "ambiguous",
      result: { operationId: "operation-1" },
      externalId: undefined,
      error: undefined,
    });
    expect(mocks.publish).toHaveBeenCalledWith("flipkart", {
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "publish",
        input: {
          channelId: "channel-1",
          listingId: "listing-1",
          idempotencyKey: "request-1",
          listing,
        },
      },
      confirmLivePublish: true,
      idempotencyKey: "request-1",
    });
  });

  it("does not translate a disabled live publish into success", async () => {
    mocks.publish.mockResolvedValue({
      status: "failed",
      error: { code: "LIVE_PUBLISH_DISABLED" },
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        listingId: "listing-1",
        idempotencyKey: "request-1",
        confirmLivePublish: true,
        listing,
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "LIVE_PUBLISH_DISABLED",
    });
  });

  it("maps idempotency conflicts to 409", () => {\n    expect(getFlipkartPublishErrorStatus("IDEMPOTENCY_KEY_CONFLICT")).toBe(409);\n    expect(getFlipkartPublishErrorStatus("IDEMPOTENCY_PAYLOAD_CONFLICT")).toBe(409);\n  });\n\n  it("keeps resource and reconciliation conflicts bounded", () => {
    expect(getFlipkartPublishErrorStatus("CHANNEL_NOT_FOUND")).toBe(404);
    expect(getFlipkartPublishErrorStatus("LISTING_NOT_FOUND")).toBe(404);
    expect(getFlipkartPublishErrorStatus("PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION")).toBe(409);
  });
});
