import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCommerceChannelById: vi.fn(),
  pool: { query: vi.fn(), connect: vi.fn() },
  getWooCommerceChannelConfig: vi.fn(),
  getWooCommerceProduct: vi.fn(),
  findWooCommerceProductsBySku: vi.fn(),
}));

vi.mock("@/lib/commerce/channels/service", () => ({
  getCommerceChannelById: mocks.getCommerceChannelById,
}));
vi.mock("@/lib/db", () => ({ pool: mocks.pool }));
vi.mock("@/lib/platforms/woocommerce/client", () => ({
  getWooCommerceChannelConfig: mocks.getWooCommerceChannelConfig,
  getWooCommerceProduct: mocks.getWooCommerceProduct,
  findWooCommerceProductsBySku: mocks.findWooCommerceProductsBySku,
}));

import { reconcileWooCommercePublish } from "@/lib/platforms/woocommerce/reconcile";

const input = {
  channelId: "channel-1",
  listingId: "listing-1",
  idempotencyKey: "request-1",
  externalId: "101",
};

function mockReadyState() {
  mocks.getCommerceChannelById.mockResolvedValue({
    id: "channel-1",
    provider: "woocommerce",
  });
  mocks.pool.query
    .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "ambiguous" }] })
    .mockResolvedValueOnce({
      rows: [{ id: "listing-1", publish_idempotency_key: "request-1", expected_sku: "SKU-1" }],
    });
  mocks.getWooCommerceChannelConfig.mockResolvedValue({
    config: { baseUrl: "https://shop.example" },
  });
}

function mockDb() {
  const query = vi.fn()
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "ambiguous" }] })
    .mockResolvedValueOnce({ rowCount: 1 })
    .mockResolvedValueOnce({ rowCount: 1 })
    .mockResolvedValueOnce({});
  const client = { query, release: vi.fn() };
  mocks.pool.connect.mockResolvedValue(client);
  return query;
}

describe("reconcileWooCommercePublish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reconciles an ambiguous attempt and atomically completes the listing", async () => {
    mockReadyState();
    mocks.getWooCommerceProduct.mockResolvedValue({ id: 101, sku: "SKU-1", name: "Demo" });
    const dbQuery = mockDb();

    await expect(
      reconcileWooCommercePublish(7, input),
    ).resolves.toEqual({
      product: { id: 101, sku: "SKU-1", name: "Demo" },
      externalId: "101",
      reconciled: true,
    });

    expect(mocks.getWooCommerceProduct).toHaveBeenCalledWith(
      { baseUrl: "https://shop.example" },
      "101",
    );
    expect(dbQuery).toHaveBeenCalledWith("BEGIN");
    expect(dbQuery).toHaveBeenCalledWith("COMMIT");
  });

  it("rejects a provider product whose SKU does not match the durable listing identity", async () => {
    mockReadyState();
    mocks.getWooCommerceProduct.mockResolvedValue({ id: 101, sku: "WRONG-SKU" });

    await expect(
      reconcileWooCommercePublish(7, input),
    ).resolves.toEqual({ error: "PROVIDER_SKU_MISMATCH" });

    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });

  it("rejects ambiguous SKU lookup when more than one provider product matches", async () => {
    mockReadyState();
    const { externalId: _externalId, ...skuInput } = input;
    mocks.findWooCommerceProductsBySku.mockResolvedValue([
      { id: 101, sku: "SKU-1" },
      { id: 102, sku: "SKU-1" },
    ]);

    await expect(
      reconcileWooCommercePublish(7, { ...skuInput, sku: "SKU-1" }),
    ).resolves.toEqual({ error: "MULTIPLE_PROVIDER_PRODUCTS_FOUND" });

    expect(mocks.pool.connect).not.toHaveBeenCalled();
  });

  it("does not mutate state when the attempt has already been reconciled", async () => {
    mocks.getCommerceChannelById.mockResolvedValue({ id: "channel-1", provider: "woocommerce" });
    mocks.pool.query.mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "succeeded" }] });

    await expect(
      reconcileWooCommercePublish(7, input),
    ).resolves.toEqual({ error: "PUBLISH_ATTEMPT_ALREADY_RECONCILED" });

    expect(mocks.pool.connect).not.toHaveBeenCalled();
    expect(mocks.getWooCommerceChannelConfig).not.toHaveBeenCalled();
  });

  it("rolls back when listing persistence fails", async () => {
    mockReadyState();
    mocks.getWooCommerceProduct.mockResolvedValue({ id: 101, sku: "SKU-1", name: "Demo" });

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "ambiguous" }] })
      .mockRejectedValueOnce(new Error("listing update failed"))
      .mockResolvedValueOnce({});
    const client = { query, release: vi.fn() };
    mocks.pool.connect.mockResolvedValue(client);

    await expect(
      reconcileWooCommercePublish(7, input),
    ).resolves.toEqual({
      error: "RECONCILIATION_FAILED",
      message: "listing update failed",
    });

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back when attempt persistence fails after the listing update", async () => {
    mockReadyState();
    mocks.getWooCommerceProduct.mockResolvedValue({ id: 101, sku: "SKU-1", name: "Demo" });

    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "attempt-1", status: "ambiguous" }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockRejectedValueOnce(new Error("attempt update failed"))
      .mockResolvedValueOnce({});
    const client = { query, release: vi.fn() };
    mocks.pool.connect.mockResolvedValue(client);

    await expect(
      reconcileWooCommercePublish(7, input),
    ).resolves.toEqual({
      error: "RECONCILIATION_FAILED",
      message: "attempt update failed",
    });

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
