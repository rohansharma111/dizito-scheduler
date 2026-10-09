import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, consumeRateLimit, apiSignRequest } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  consumeRateLimit: vi.fn(),
  apiSignRequest: vi.fn(() => "signed-value"),
}));

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/lib/cloudinary", () => ({
  default: { utils: { api_sign_request: apiSignRequest } },
}));

import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/upload/signature", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/upload/signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLOUDINARY_API_KEY", "api-key");
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "cloud-name");
    vi.stubEnv("CLOUDINARY_API_SECRET", "api-secret");
    getServerSession.mockResolvedValue({ user: { id: "42" } });
    consumeRateLimit.mockResolvedValue({ allowed: true, resetAt: new Date(Date.now() + 60_000) });
  });

  it("rejects unauthenticated signature requests", async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(jsonRequest({ mimeType: "video/mp4", size: 100 }));
    expect(response.status).toBe(401);
    expect(apiSignRequest).not.toHaveBeenCalled();
  });

  it("rejects rate-limited signature requests", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, resetAt: new Date(Date.now() + 30_000) });
    const response = await POST(jsonRequest({ mimeType: "video/mp4", size: 100 }));
    expect(response.status).toBe(429);
    expect(apiSignRequest).not.toHaveBeenCalled();
  });

  it("does not issue direct-upload signatures for images", async () => {
    const response = await POST(jsonRequest({ mimeType: "image/jpeg", size: 100 }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Direct uploads are only supported for video files" });
    expect(apiSignRequest).not.toHaveBeenCalled();
  });

  it("signs a server-generated public ID and allowed formats for supported videos", async () => {
    const response = await POST(jsonRequest({ mimeType: "video/mp4", size: 100 }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      cloudName: "cloud-name",
      apiKey: "api-key",
      signature: "signed-value",
      allowedFormats: "mp4",
      resourceType: "video",
      uploadProtocol: "cloudinary_signed_direct",
    });
    expect(data.publicId).toMatch(/^users\/42\/video-[0-9a-f-]{36}$/);
    expect(apiSignRequest).toHaveBeenCalledWith(
      {
        public_id: data.publicId,
        timestamp: expect.any(Number),
        allowed_formats: "mp4",
      },
      "api-secret",
    );
  });

  it("signs only formats compatible with the requested MIME type", async () => {
    const response = await POST(jsonRequest({ mimeType: "video/quicktime", size: 100 }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.allowedFormats).toBe("mov,mp4");
    expect(apiSignRequest).toHaveBeenCalledWith(
      expect.objectContaining({ public_id: data.publicId, allowed_formats: "mov,mp4" }),
      "api-secret",
    );
  });

  it("normalizes MIME types before selecting signed format restrictions", async () => {
    const response = await POST(jsonRequest({ mimeType: " VIDEO/MP4 ", size: 100 }));
    expect(response.status).toBe(200);
    expect(apiSignRequest).toHaveBeenCalledWith(
      expect.objectContaining({ allowed_formats: "mp4" }),
      "api-secret",
    );
  });
});
