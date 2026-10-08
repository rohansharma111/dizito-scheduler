import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  persistApprovedWeek: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/marketing/approveWeek", () => ({ persistApprovedWeek: mocks.persistApprovedWeek }));

import { POST } from "@/app/api/marketing/weekly-plans/approve/route";

function request(body: unknown) {
  return new Request("http://localhost/api/marketing/weekly-plans/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const strategy = {
  strategySummary: "Focus on the spring offer.",
  campaigns: [{
    name: "Spring campaign",
    objective: "Drive orders",
    audience: "Local buyers",
    cta: "Shop now",
    contentItems: [{
      contentType: "promotional",
      format: "post",
      topic: "Spring offer",
      cta: "Shop now",
    }],
  }],
};

describe("POST /api/marketing/weekly-plans/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "42" } });
  });

  it("passes an approved weekly strategy to the persistence boundary", async () => {
    mocks.persistApprovedWeek.mockResolvedValue({ id: 55, status: "approved" });

    const response = await POST(request({
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      strategy,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ weeklyPlan: { id: 55, status: "approved" } });
    expect(mocks.persistApprovedWeek).toHaveBeenCalledWith(42, "2026-10-12", "2026-10-18", strategy);
  });

  it("keeps duplicate weekly approval as a conflict", async () => {
    mocks.persistApprovedWeek.mockRejectedValue(new Error("Weekly plan is already approved"));

    const response = await POST(request({
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      strategy,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Weekly plan is already approved" });
  });
});
