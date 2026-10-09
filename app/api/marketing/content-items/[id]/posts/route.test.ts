import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ pool: { connect: mocks.connect } }));

import { POST } from "@/app/api/marketing/content-items/[id]/posts/route";

function request(body: unknown) {
  return new Request("http://localhost/api/marketing/content-items/100/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/marketing/content-items/[id]/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "42" } });
  });

  it("preserves variant provenance when linking a post", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 200 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 300, platform: "instagram" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ "?column?": 1 }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    mocks.connect.mockResolvedValue({ query, release: vi.fn() });

    const response = await POST(request({ postId: 200, variantId: 300 }), {
      params: Promise.resolve({ id: "100" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      contentItemId: 100,
      postId: 200,
      variantId: 300,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO marketing_content_item_posts"),
      [100, 200, 300],
    );
  });

  it("does not allow a variant from another tenant", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 200 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce(undefined);
    mocks.connect.mockResolvedValue({ query, release: vi.fn() });

    const response = await POST(request({ postId: 200, variantId: 300 }), {
      params: Promise.resolve({ id: "100" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Content variant not found" });
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO marketing_content_item_posts"),
      expect.anything(),
    );
  });
});
