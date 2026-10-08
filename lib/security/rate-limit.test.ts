import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@/lib/db", () => ({ pool: { query } }));

describe("distributed rate limiter", () => {
  beforeEach(() => {
    query.mockReset();
    process.env.RATE_LIMIT_HASH_KEY = "test-rate-limit-secret";
  });

  it("hashes the bucket and identifier and allows the first request", async () => {
    query.mockResolvedValue({ rows: [{ request_count: 1, window_started_at: new Date("2026-10-08T18:00:00.000Z") }] });
    const { consumeRateLimit } = await import("./rate-limit");
    const result = await consumeRateLimit({ bucket: "ai:creator", identifier: "user:42", limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual([expect.any(String), 60]);
    expect(query.mock.calls[0][1][0]).not.toBe("user:42");
  });

  it("blocks requests after the configured limit", async () => {
    query.mockResolvedValue({ rows: [{ request_count: 6, window_started_at: new Date("2026-10-08T18:00:00.000Z") }] });
    const { consumeRateLimit } = await import("./rate-limit");
    const result = await consumeRateLimit({ bucket: "ai:creator", identifier: "user:42", limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.resetAt.toISOString()).toBe("2026-10-08T18:01:00.000Z");
  });
}