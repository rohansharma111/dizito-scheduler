import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  draft: vi.fn(),
  preparePublish: vi.fn(),
  executePublish: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/platforms/flipkart/draft", () => ({
  prepareFlipkartListingDraft: mocks.draft,
}));

vi.mock("@/lib/platforms/flipkart/publish", () => ({
  prepareFlipkartListingPublish: mocks.preparePublish,
  executePreparedFlipkartPublish: mocks.executePublish,
}));

vi.mock("@/lib/platforms/flipkart/reconcile", () => ({
  reconcileFlipkartPublishOperation: mocks.reconcile,
}));

import { flipkartAdapter } from "@/lib/platforms/flipkart/adapter";

describe("flipkartAdapter", () => {
  it("advertises the currently implemented Flipkart workflow capabilities", () => {
    expect(flipkartAdapter.capabilities).toEqual({
      draft: true,
      publish: true,
      reconcile: true,
      sync: false,
      inventory: false,
      pricing: false,
      orders: false,
      returns: false,
      webhooks: false,
    });
  });

  it("rejects a payload routed to the wrong operation", async () => {
    const result = await flipkartAdapter.publish({
      context: { channelId: "channel-1", userId: 7 },
      payload: { action: "draft", input: {} as never },
      confirmLivePublish: true,
    });

    expect(result).toMatchObject({
      operation: "publish",
      status: "failed",
      error: { code: "INVALID_OPERATION_PAYLOAD", retryable: false, ambiguous: false },
    });
    expect(mocks.preparePublish).not.toHaveBeenCalled();
  });

  it("binds draft execution to the contract channel context", async () => {
    mocks.draft.mockResolvedValue({
      listing: { id: "listing-1" },
      mapping: { provider: "flipkart" },
      publishReady: false,
    });

    const input = {
      channelId: "payload-channel",
      product: {
        productId: "product-1",
        title: "Demo",
        variants: [{ variantId: "variant-1", sku: "SKU-1" }],
      },
      variants: [{ variantId: "variant-1" }],
    };

    const result = await flipkartAdapter.prepareDraft({
      context: { channelId: "context-channel", userId: 7 },
      payload: { action: "draft", input },
    });

    expect(mocks.draft).toHaveBeenCalledWith(7, {
      ...input,
      channelId: "context-channel",
    });
    expect(result).toMatchObject({ operation: "draft", status: "succeeded" });
  });


  it("normalizes a confirmed reconciliation external id", async () => {
    mocks.reconcile.mockResolvedValue({
      operationId: "operation-1",
      listingId: "listing-1",
      provider: "flipkart",
      status: "succeeded",
      providerResult: { externalId: "FK-123" },
      externalIdConfirmed: true,
    });

    const result = await flipkartAdapter.reconcilePublish({
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "reconcile",
        input: {
          channelId: "payload-channel",
          operationId: "operation-1",
          listingId: "listing-1",
          skuIds: ["SKU-1"],
        },
      },
    });

    expect(result).toMatchObject({
      operation: "reconcile",
      status: "succeeded",
      externalId: "FK-123",
    });
    expect(mocks.reconcile).toHaveBeenCalledWith(7, {
      channelId: "context-channel",
      operationId: "operation-1",
      listingId: "listing-1",
      skuIds: ["SKU-1"],
    });
  });

  it("normalizes a disabled live publish to a provider-neutral failure", async () => {
    mocks.preparePublish.mockResolvedValue({
      operation: {
        id: "operation-1",
        operation: "create",
        status: "prepared",
      },
      channelId: "channel-1",
      listingId: "listing-1",
      payload: { product_id: "product-1" },
      livePublishEnabled: false,
    });
    mocks.executePublish.mockResolvedValue({
      status: "disabled",
      operationId: "operation-1",
    });

    const result = await flipkartAdapter.publish({
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "publish",
        input: {
          channelId: "channel-1",
          listingId: "listing-1",
          operation: "create",
          idempotencyKey: "request-1",
          listing: {
            productId: "product-1",
            price: { mrp: 100, selling_price: 90, currency: "INR" },
            tax: { hsn: "1234" },
            listingStatus: "INACTIVE",
            fulfillmentProfile: "NON_FBF",
            packages: [{ name: "Demo" }],
            locations: [{ id: "LOC-1", status: "ENABLED" }],
          },
        },
      },
      confirmLivePublish: true,
    });

    expect(result).toMatchObject({
      operation: "publish",
      status: "failed",
      error: { code: "LIVE_PUBLISH_DISABLED" },
    });
  });
});
