import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  connect: vi.fn(),
  getCurrentUsage: vi.fn(),
  getPlan: vi.fn(),
  canCreatePost: vi.fn(),
  incrementPostsCreated: vi.fn(),
  createEvent: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ pool: { connect: mocks.connect } }));
vi.mock("@/lib/plans", () => ({ getPlan: mocks.getPlan, canCreatePost: mocks.canCreatePost }));
vi.mock("@/lib/usage/getCurrentUsage", () => ({ getCurrentUsage: mocks.getCurrentUsage }));
vi.mock("@/lib/usage/incrementPostsCreated", () => ({ incrementPostsCreated: mocks.incrementPostsCreated }));
vi.mock("@/lib/events", () => ({ createEvent: mocks.createEvent }));

import { POST } from "@/app/api/marketing/content-items/[id]/create-post/route";

function request(body: unknown) {
  return new Request("http://localhost/api/marketing/content-items/100/create-post", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/marketing/content-items/[id]/create-post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "42" } });
  });

  it("rejects scheduling before human approval", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100, status: "planned", campaign_id: 10 }] })
      .mockResolvedValueOnce(undefined);
    mocks.connect.mockResolvedValue({ query, release: vi.fn() });

    const response = await POST(request({
      selectedAccounts: [7],
      scheduleTime: "2026-10-09T10:00:00.000Z",
      variantId: null,
    }), { params: Promise.resolve({ id: "100" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Content item must be approved before it can be scheduled",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE ci.id = $1 AND ci.user_id = $2"),
      [100, 42],
    );
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posts"), expect.anything());
  });

  it("does not expose another tenant's content item", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce(undefined);
    mocks.connect.mockResolvedValue({ query, release: vi.fn() });

    const response = await POST(request({
      selectedAccounts: [7],
      scheduleTime: "2026-10-09T10:00:00.000Z",
    }), { params: Promise.resolve({ id: "100" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Content item not found" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ci.user_id = $2"), [100, 42]);
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posts"), expect.anything());
  });
});
