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
function makeReservationClient(query: ReturnType<typeof vi.fn>) {
  return {
    query,
    release: vi.fn(),
  };
}

function mockOwnedWooCommerceChannel() {
  mocks.getCommerceChannelById.mockResolvedValue({
    id: "channel-1",
    provider: "woocommerce",
  });
}



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

  it("replays a completed attempt without calling WooCommerce", async () => {
    mockOwnedWooCommerceChannel();

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "listing-1", external_id: null, publish_idempotency_key: "request-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "succeeded", external_id: "wc-101", response_payload: { id: 101 } }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const client = makeReservationClient(query);
    mocks.pool.connect.mockResolvedValue(client);
    mocks.pool.query.mockResolvedValue({});

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({
      result: { id: 101 },
      externalId: "wc-101",
      idempotentReplay: true,
    });

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(mocks.createWooCommerceProduct).not.toHaveBeenCalled();
    expect(mocks.pool.query).toHaveBeenCalledTimes(1);
  });

  it("stops an in-flight attempt and requires reconciliation", async () => {
    mockOwnedWooCommerceChannel();

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "listing-1", external_id: null, publish_idempotency_key: "request-1" }] })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "started", external_id: null, response_payload: null }] })
      .mockResolvedValueOnce({});
    const client = makeReservationClient(query);
    mocks.pool.connect.mockResolvedValue(client);

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({ error: "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION" });

    expect(mocks.createWooCommerceProduct).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
  });

  it("persists a successful provider publish", async () => {
    mockOwnedWooCommerceChannel();

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "listing-1", external_id: null, publish_idempotency_key: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const client = makeReservationClient(query);
    mocks.pool.connect.mockResolvedValue(client);
    mocks.getWooCommerceChannelConfig.mockResolvedValue({ config: { baseUrl: "https://shop.example" } });
    mocks.createWooCommerceProduct.mockResolvedValue({ id: 202, name: "Demo" });
    mocks.pool.query.mockResolvedValue({});

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({
      result: { id: 202, name: "Demo" },
      externalId: "202",
      reconciliationRequired: true,
    });

    expect(mocks.createWooCommerceProduct).toHaveBeenCalledWith(
      { baseUrl: "https://shop.example" },
      { ...input.payload, status: "publish" },
    );
    expect(mocks.pool.query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledWith("COMMIT");
  });

  it("marks a network failure ambiguous without marking the channel failed", async () => {
    mockOwnedWooCommerceChannel();

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "listing-1", external_id: null, publish_idempotency_key: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const client = makeReservationClient(query);
    mocks.pool.connect.mockResolvedValue(client);
    mocks.getWooCommerceChannelConfig.mockResolvedValue({ config: { baseUrl: "https://shop.example" } });
    mocks.createWooCommerceProduct.mockRejectedValue(new Error("ETIMEDOUT"));
    mocks.pool.query.mockResolvedValue({});

    await expect(
      publishWooCommerceProduct(7, input),
    ).resolves.toEqual({
      error: "PUBLISH_REQUIRES_RECONCILIATION",
      reconciliationRequired: true,
      message: "WooCommerce publish outcome is uncertain and requires provider read-back",
    });

    expect(mocks.pool.query).toHaveBeenCalledTimes(2);
    expect(mocks.markWooCommerceChannelError).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
  });
});
