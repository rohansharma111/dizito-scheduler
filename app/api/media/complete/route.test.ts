import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, consumeRateLimit, completeDirectUpload, resource } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  consumeRateLimit: vi.fn(),
  completeDirectUpload: vi.fn(),
  resource: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/lib/media/service", () => ({ mediaService: { completeDirectUpload } }));
vi.mock("@/lib/cloudinary", () => ({ default: { api: { resource } } }));

import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/media/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/media/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: "42" } });
    consumeRateLimit.mockResolvedValue({ allowed: true, resetAt: new Date(Date.now() + 60_000) });
    resource.mockResolvedValue({
      public_id: "users/42/media/image-1",
      secure_url: "https://res.cloudinary.com/example/image/upload/image-1.jpg",
      resource_type: "image",
      format: "jpg",
      bytes: 100,
    });
    completeDirectUpload.mockResolvedValue({ id: 1 });
  });

  it("rejects unauthenticated completion requests", async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(401);
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(resource).not.toHaveBeenCalled();
  });

  it("enforces rate limits before looking up the provider resource", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, resetAt: new Date(Date.now() + 30_000) });
    const response = await POST(jsonRequest({ publicId: "users/42/media/x", fileName: "x.jpg", mimeType: "image/jpeg" }));
    expect(response.status).toBe(429);
    expect(resource).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and incomplete payloads", async () => {
    const malformed = await POST(new Request("http://localhost/api/media/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));
    expect(malformed.status).toBe(400);

    const incomplete = await POST(jsonRequest({ publicId: "users/42/media/x" }));
    expect(incomplete.status).toBe(400);
    expect(resource).not.toHaveBeenCalled();
  });

  it("rejects another user's Cloudinary public ID before provider lookup", async () => {
    const response = await POST(jsonRequest({
      publicId: "users/43/media/image-1",
      fileName: "image.jpg",
      mimeType: "image/jpeg",
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "Invalid media ownership" });
    expect(resource).not.toHaveBeenCalled();
    expect(completeDirectUpload).not.toHaveBeenCalled();
  });

  it("finalizes only after provider resource policy checks", async () => {
    const response = await POST(jsonRequest({
      publicId: "users/42/media/image-1",
      fileName: "image.jpg",
      mimeType: "image/jpeg",
    }));
    expect(response.status).toBe(201);
    expect(resource).toHaveBeenCalledWith("users/42/media/image-1", {
      resource_type: "image",
      type: "upload",
    });
    expect(completeDirectUpload).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      publicId: "users/42/media/image-1",
      mimeType: "image/jpeg",
    }));
  });
});
