import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  draft: vi.fn(),
  publish: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/lib/platforms/woocommerce/draft", () => ({
  prepareWooCommerceListingDraft: mocks.draft,
}));
vi.mock("@/lib/platforms/woocommerce/publish", () => ({
  publishWooCommerceProduct: mocks.publish,
}));
vi.mock("@/lib/platforms/woocommerce/reconcile", () => ({
  reconcileWooCommercePublish: mocks.reconcile,
}));

import { wooCommerceAdapter, wooCommerceCapabilities } from "@/lib/platforms/woocommerce/adapter";

describe("wooCommerceAdapter", () => {
  it("advertises only implemented capabilities", () => {
    expect(wooCommerceCapabilities).toEqual({
      draft: true, publish: true, reconcile: true, sync: false,
      inventory: false, pricing: false, orders: false, returns: false, webhooks: false,
    });
  });

  it("rejects a payload routed to the wrong operation", async () => {
    const result = await wooCommerceAdapter.publish({
      context: { channelId: "channel-1", userId: 7 },
      payload: { action: "draft", input: {} as never },
      confirmLivePublish: true,
    });
    expect(result).toMatchObject({
      operation: "publish", status: "failed",
      error: { code: "INVALID_ADAPTER_OPERATION", retryable: false, ambiguous: false },
    });
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("delegates draft through the shared provider contract", async () => {
    mocks.draft.mockResolvedValue({ listing: { id: "listing-1" }, payload: { sku: "SKU-1" } });
    const input = {
      channelId: "channel-1", productId: "product-1",
      product: { name: "Demo", price: 10 }, variants: [],
    };
    const result = await wooCommerceAdapter.prepareDraft({
      context: { channelId: "channel-1", userId: 7 },
      payload: { action: "draft", input },
    });
    expect(mocks.draft).toHaveBeenCalledWith(7, { ...input, channelId: "channel-1" });
    expect(result).toMatchObject({ operation: "draft", status: "succeeded" });
  });

  it("propagates publish idempotency and live confirmation", async () => {
    mocks.publish.mockResolvedValue({ externalId: "101", result: { id: 101 } });
    const input = {
      channelId: "channel-1", listingId: "listing-1", payload: { name: "Demo" },
      confirmLivePublish: false, idempotencyKey: "payload-key",
    };
    const result = await wooCommerceAdapter.publish({
      context: { channelId: "channel-1", userId: 7 },
      payload: { action: "publish", input },
      confirmLivePublish: true, idempotencyKey: "contract-key",
    });
    expect(mocks.publish).toHaveBeenCalledWith(7, {
      ...input, channelId: "channel-1", confirmLivePublish: true, idempotencyKey: "contract-key",
    });
    expect(result).toMatchObject({ operation: "publish", status: "succeeded", externalId: "101" });
  });

  it("normalizes service errors to the provider-neutral contract", async () => {
    mocks.reconcile.mockResolvedValue({ error: "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION" });
    const result = await wooCommerceAdapter.reconcilePublish({
      context: { channelId: "channel-1", userId: 7 },
      payload: {
        action: "reconcile",
        input: {
          channelId: "channel-1", listingId: "listing-1",
          idempotencyKey: "request-1", sku: "SKU-1",
        },
      },
      lookupKey: "SKU-1",
    });
    expect(result).toMatchObject({
      operation: "reconcile", status: "failed",
      error: { code: "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION", retryable: false, ambiguous: false },
    });
  });
});
