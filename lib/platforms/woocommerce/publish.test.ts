import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCommerceChannelById: vi.fn(),
  pool: { connect: vi.fn(), query: vi.fn() },
  createWooCommerceProduct: vi.fn(),
  getWooCommerceChannelConfig: vi.fn(),
  markWooCommerceChannelError: vi.fn(),
}));

vi.mock("@/lib/commerce/channels/service", () => ({
  getCommerceChannelById: mocks.getCommerceChannelById,
}));

vi.mock("@/lib/db", () => ({
  pool: mocks.pool,
}));

vi.mock("@/lib/platforms/woocommerce/client", () => ({
  createWooCommerceProduct: mocks.createWooCommerceProduct,
  getWooCommerceChannelConfig: mocks.getWooCommerceChannelConfig,
  markWooCommerceChannelError: mocks.markWooCommerceChannelError,
}));

import { publishWooCommerceProduct } from "@/lib/platforms/woocommerce/publish";

const input = {
  channelId: "channel-1",
  listingId: "listing-1",
  payload: { name: "Demo", sku: "SKU-1" },
  confirmLivePublish: true,
  idempotencyKey: "request-1",
};

describe("publishWooCommerceProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires explicit live-publish confirmation", async () => {
    await expect(
      publishWooCommerceProduct(7, { ...input, confirmLivePublish: false }),
    ).resolves.toEqual({ error: "LIVE_PUBLISH_CONFIRMATION_REQUIRED" });

    expect(mocks.getCommerceChannelById).not.toHaveBeenCalled();
    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });

  it("requires an idempotency key at the service boundary", async () => {
    await expect(
      publishWooCommerceProduct(7, { ...input, idempotencyKey: " " }),
    ).resolves.toEqual({ error: "IDEMPOTENCY_KEY_REQUIRED" });

    expect(mocks.getCommerceChannelById).not.toHaveBeenCalled();
    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });

  it("enforces tenant-scoped channel ownership", async () => {
    mocks.getCommerceChannelById.mockResolvedValue(null);

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({ error: "CHANNEL_NOT_FOUND" });

    expect(mocks.getCommerceChannelById).toHaveBeenCalledWith("channel-1", 7);
    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });

  it("rejects non-WooCommerce channels before opening a publish transaction", async () => {
    mocks.getCommerceChannelById.mockResolvedValue({
      id: "channel-1",
      provider: "shopify",
    });

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({ error: "INVALID_PROVIDER" });

    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });
});
