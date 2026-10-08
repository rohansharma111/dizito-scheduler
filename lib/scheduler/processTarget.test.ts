import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const publisher = vi.fn();

vi.mock("@/lib/db", () => ({
  pool: { query },
}));

vi.mock("@/lib/publishers", () => ({
  publishers: {
    facebook: publisher,
  },
}));

describe("processTarget tenant isolation", () => {
  beforeEach(() => {
    query.mockReset();
    publisher.mockReset();
  });

  it("scopes the credential-bearing social account lookup to the post owner", async () => {
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      const text = String(sql);

      if (text.includes("FROM posts p")) {
        return {
          rows: [
            {
              id: 101,
              user_id: 42,
              secure_url: "https://cdn.example/image.jpg",
              post: "Test post",
            },
          ],
        };
      }

      if (text.includes("FROM social_accounts")) {
        expect(text).toContain("WHERE id = $1");
        expect(text).toContain("AND user_id = $2");
        expect(params).toEqual([9001, 42]);

        return {
          rows: [
            {
              id: 9001,
              user_id: 42,
              page_id: "page-42",
              page_access_token: "test-token",
            },
          ],
        };
      }

      throw new Error("Unexpected query");
    });

    publisher.mockResolvedValue({ success: true });

    const { processTarget } = await import("./processTarget");

    const result = await processTarget({
      id: 7001,
      platform: "facebook",
      post_id: 101,
      social_account_id: 9001,
    });

    expect(result.userId).toBe(42);
    expect(result.account.user_id).toBe(42);
    expect(publisher).toHaveBeenCalledOnce();
  });

  it("does not publish when the target account is owned by another tenant", async () => {
    query.mockImplementation(async (sql: string) => {
      const text = String(sql);

      if (text.includes("FROM posts p")) {
        return {
          rows: [
            {
              id: 101,
              user_id: 42,
              secure_url: "https://cdn.example/image.jpg",
              post: "Test post",
            },
          ],
        };
      }

      if (text.includes("FROM social_accounts")) {
        expect(text).toContain("AND user_id = $2");
        return { rows: [] };
      }

      throw new Error("Unexpected query");
    });

    const { processTarget } = await import("./processTarget");

    await expect(
      processTarget({
        id: 7001,
        platform: "facebook",
        post_id: 101,
        social_account_id: 9002,
      }),
    ).rejects.toThrow("Account not found");

    expect(publisher).not.toHaveBeenCalled();
  });
});
