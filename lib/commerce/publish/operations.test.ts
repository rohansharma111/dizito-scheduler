import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  pool: {
    query: mocks.query,
    connect: mocks.connect,
  },
}));

import {
  markCommercePublishOperationFailed,
  markCommercePublishOperationStarted,
  markCommercePublishOperationSucceeded,
  markCommercePublishOperationUnknown,
} from "@/lib/commerce/publish/operations";

function makeTransactionClient(query: ReturnType<typeof vi.fn>) {
  return {
    query,
    release: vi.fn(),
  };
}

describe("commerce publish operation lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.connect.mockReset();
  });

  it("requires a confirmed external id before marking success", async () => {
    await expect(
      markCommercePublishOperationSucceeded(7, "operation-1", "   ", "listing-1", "flipkart"),
    ).resolves.toBeNull();

    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("trims and persists the confirmed external id", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "operation-1", status: "in_progress", listing_id: "listing-1", provider: "flipkart" }] })
      .mockResolvedValueOnce({ rows: [{ id: "listing-1", channel_id: "channel-1", external_id: null }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "operation-1", status: "succeeded", external_id: "FK-123" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const client = makeTransactionClient(query);
    mocks.connect.mockResolvedValue(client);

    const result = await markCommercePublishOperationSucceeded(
      7,
      "operation-1",
      "  FK-123  ",
      "listing-1",
      "flipkart",
    );

    expect(result).toMatchObject({
      id: "operation-1",
      status: "succeeded",
      external_id: "FK-123",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("status IN ('prepared', 'in_progress', 'unknown')"),
      ["operation-1", 7, "listing-1", "flipkart"],
    );
    expect(query).toHaveBeenCalledWith("COMMIT");
  });

  it("does not allow a terminal success to be reopened", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] });
    mocks.connect.mockResolvedValue(makeTransactionClient(query));

    await markCommercePublishOperationSucceeded(7, "operation-1", "FK-123", "listing-1", "flipkart");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("status IN ('prepared', 'in_progress', 'unknown')"),
      ["operation-1", 7, "listing-1", "flipkart"],
    );
  });

  it("only starts prepared or failed operations", async () => {
    await markCommercePublishOperationStarted(7, "operation-1");

    const sql = mocks.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("status IN ('prepared', 'failed')");
  });

  it("only moves in-progress operations to unknown", async () => {
    await markCommercePublishOperationUnknown(7, "operation-1", "timeout");

    const sql = mocks.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("status = 'in_progress'");
  });

  it("only moves prepared or in-progress operations to failed", async () => {
    await markCommercePublishOperationFailed(7, "operation-1", "provider error");

    const sql = mocks.query.mock.calls[0]?.[0] as string;
    expect(sql).toContain("status IN ('prepared', 'in_progress')");
  });
});
