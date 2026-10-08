import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  query: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ pool: { query: mocks.query } }));

import { POST } from "@/app/api/marketing/attributions/route";

function request(body: unknown) {
  return new Request("http://localhost/api/marketing/attributions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/marketing/attributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "42" } });
  });

  it("keeps manual attribution distinct from observed customer-action value", async () => {
    mocks.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, campaignId: 10, contentItemId: 100, variantId: 300, orderId: null, value: 25, currency: "INR" }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100, campaignId: 10 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 300, contentItemId: 100 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 9,
          customerActionId: 1,
          campaignId: 10,
          contentItemId: 100,
          variantId: 300,
          postId: null,
          orderId: null,
          attributionModel: "manual",
          attributedValue: 100,
          currency: "INR",
          weight: 1,
          note: "Merchant attribution",
        }],
      });

    const response = await POST(request({
      customerActionId: 1,
      campaignId: 10,
      contentItemId: 100,
      variantId: 300,
      attributedValue: 100,
      currency: "INR",
      weight: 1,
      note: "Merchant attribution",
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      attribution: { attributionModel: "manual", attributedValue: 100 },
    });
    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining("INSERT INTO marketing_attributions"),
      [42, 1, 10, 100, 300, null, null, "manual", 100, "INR", 1, "Merchant attribution"],
    );
  });

  it("does not allow another tenant's customer action to be attributed", async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await POST(request({
      customerActionId: 1,
      campaignId: 10,
      attributedValue: 100,
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Customer action not found" });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id=$1 AND user_id=$2"),
      [1, 42],
    );
  });
});
