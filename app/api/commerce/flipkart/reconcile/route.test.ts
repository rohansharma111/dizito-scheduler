import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/commerce/providers/service", () => ({
  reconcileCommerceProvider: mocks.reconcile,
}));

import { POST } from "@/app/api/commerce/flipkart/reconcile/route";

function request(body: unknown) {
  return new Request("http://localhost/api/commerce/flipkart/reconcile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/commerce/flipkart/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "7" } });
  });

  it("requires a lookup key or SKU identifiers before provider dispatch", async () => {
    const response = await POST(
      request({
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("does not allow an external id alone to declare reconciliation success", async () => {
    const response = await POST(
      request({
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
        externalId: "FK-123",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it("dispatches reconciliation with normalized identifiers and tenant context", async () => {
    mocks.reconcile.mockResolvedValue({
      operation: "reconcile",
      status: "succeeded",
      externalId: "FK-123",
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
        lookupKey: " SKU-1 ",
        skuIds: [" SKU-1 ", "", 42],
        externalId: " FK-123 ",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      operation: "reconcile",
      status: "succeeded",
      externalId: "FK-123",
    });
    expect(mocks.reconcile).toHaveBeenCalledWith("flipkart", {
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "reconcile",
        input: {
          channelId: "channel-1",
          operationId: "operation-1",
          listingId: "listing-1",
          skuIds: ["SKU-1"],
          externalId: "FK-123",
          lookupKey: "SKU-1",
        },
      },
      externalId: "FK-123",
      lookupKey: "SKU-1",
    });
  });

  it("maps a missing publish operation to 404", async () => {
    mocks.reconcile.mockResolvedValue({
      status: "failed",
      error: { code: "PUBLISH_ATTEMPT_NOT_FOUND" },
    });

    const response = await POST(
      request({
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
        skuIds: ["SKU-1"],
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "PUBLISH_ATTEMPT_NOT_FOUND",
    });
  });
});
