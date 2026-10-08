import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChannelConfig: vi.fn(),
  getListings: vi.fn(),
  markSucceeded: vi.fn(),
  pool: { query: vi.fn() },
}));

vi.mock("@/lib/platforms/flipkart/client", () => ({
  getFlipkartChannelConfig: mocks.getChannelConfig,
  getFlipkartListings: mocks.getListings,
}));

vi.mock("@/lib/db", () => ({ pool: mocks.pool }));

vi.mock("@/lib/commerce/publish/operations", () => ({
  markCommercePublishOperationSucceeded: mocks.markSucceeded,
}));

import { reconcileFlipkartPublishOperation } from "@/lib/platforms/flipkart/reconcile";

describe("reconcileFlipkartPublishOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pool.query.mockResolvedValue({
      rows: [{ id: "operation-1", listing_id: "listing-1", provider: "flipkart", status: "in_progress" }],
    });
    mocks.getChannelConfig.mockResolvedValue({
      config: { accessToken: "token", environment: "sandbox" },
    });
  });

  it("persists the provider-confirmed external id before reporting success", async () => {
    mocks.getListings.mockResolvedValue({
      listings: [{ listingId: "FK-123", sku: "SKU-1" }],
    });
    mocks.markSucceeded.mockResolvedValue({
      id: "operation-1",
      status: "succeeded",
      external_id: "FK-123",
    });

    const result = await reconcileFlipkartPublishOperation(7, {
      channelId: "channel-1",
      operationId: "operation-1",
      listingId: "listing-1",
      skuIds: ["SKU-1"],
    });

    expect(result).toMatchObject({
      status: "succeeded",
      externalIdConfirmed: true,
      externalId: "FK-123",
    });
    expect(mocks.markSucceeded).toHaveBeenCalledWith(7, "operation-1", "FK-123", "listing-1", "flipkart");
  });

  it("never treats a caller-supplied external id as provider confirmation", async () => {
    mocks.getListings.mockResolvedValue({ listings: [{ sku: "SKU-1" }] });

    const result = await reconcileFlipkartPublishOperation(7, {
      channelId: "channel-1",
      operationId: "operation-1",
      listingId: "listing-1",
      skuIds: ["SKU-1"],
      externalId: "FK-FAKE",
    });

    expect(result.status).toBe("unknown");
    expect(result.externalIdConfirmed).toBe(false);
    expect(mocks.markSucceeded).not.toHaveBeenCalled();
  });

  it("rejects a caller external id that disagrees with provider confirmation", async () => {
    mocks.getListings.mockResolvedValue({ listingId: "FK-123" });

    await expect(
      reconcileFlipkartPublishOperation(7, {
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
        skuIds: ["SKU-1"],
        externalId: "FK-999",
      }),
    ).rejects.toThrow("external ID mismatch");

    expect(mocks.markSucceeded).not.toHaveBeenCalled();
  });

  it("requires a provider lookup identifier", async () => {
    await expect(
      reconcileFlipkartPublishOperation(7, {
        channelId: "channel-1",
        operationId: "operation-1",
        listingId: "listing-1",
        skuIds: [],
      }),
    ).rejects.toThrow("SKU or lookup key");

    expect(mocks.getListings).not.toHaveBeenCalled();
  });
});
