import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, consumeRateLimit, uploadMedia, matchesDeclaredMediaType } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  consumeRateLimit: vi.fn(),
  uploadMedia: vi.fn(),
  matchesDeclaredMediaType: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/lib/media/service", () => ({ mediaService: { uploadMedia } }));
vi.mock("@/lib/security/media-signature", () => ({ matchesDeclaredMediaType }));

import { POST } from "./route";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/upload", { method: "POST", headers });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: "42" } });
    consumeRateLimit.mockResolvedValue({ allowed: true, resetAt: new Date(Date.now() + 60_000) });
    matchesDeclaredMediaType.mockReturnValue(true);
    uploadMedia.mockResolvedValue({ id: 7 });
  });

  it("rejects unauthenticated requests before parsing the body", async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("rejects malformed numeric user IDs", async () => {
    getServerSession.mockResolvedValue({ user: { id: "NaN" } });
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("enforces the upload rate limit before parsing the body", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, resetAt: new Date(Date.now() + 30_000) });
    const response = await POST(makeRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("rejects a malformed Content-Length before multipart parsing", async () => {
    const response = await POST(makeRequest({ "content-length": "12x" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Invalid Content-Length header" });
  });

  it("rejects unsafe Content-Length values before multipart parsing", async () => {
    const response = await POST(makeRequest({ "content-length": "999999999999999999999999999999" }));
    expect(response.status).toBe(400);
  });

  it("rejects oversized declared multipart bodies before parsing", async () => {
    const response = await POST(makeRequest({ "content-length": String(26 * 1024 * 1024 + 1) }));
    expect(response.status).toBe(413);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("returns a client error for malformed multipart bodies", async () => {
    const response = await POST(new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=missing-boundary" },
      body: "not a multipart body",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: "Invalid multipart upload request",
    });
  });
});
