import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, videoPosterUrl } = vi.hoisted(() => ({
  create: vi.fn(),
  videoPosterUrl: vi.fn(() => "https://res.cloudinary.com/example/video/upload/poster.jpg"),
}));

vi.mock("./repository", () => ({
  mediaRepository: { create },
}));

vi.mock("./cloudinary", () => ({
  mediaCloudinary: { videoPosterUrl },
}));

import { MediaService } from "./service";

describe("MediaService.completeDirectUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: 1 });
  });

  const baseInput = {
    userId: 42,
    publicId: "users/42/media/video-1",
    fileName: "video.mp4",
    mimeType: "video/mp4",
    uploadProtocol: "cloudinary_signed_direct" as const,
  };

  it("persists a Cloudinary resource only when type, format, ownership and size match", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video",
        format: "mp4",
        bytes: 1024,
        duration: 12,
      },
    })).resolves.toEqual({ id: 1 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42, cloudinaryPublicId: baseInput.publicId, mimeType: "video/mp4",
      resourceType: "video", format: "mp4", bytes: 1024, processingState: "ready",
    }));
  });

  it("rejects a resource whose Cloudinary type disagrees with the declared MIME", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/image/upload/video-1.png",
        resource_type: "image", format: "png", bytes: 1024,
      },
    })).rejects.toThrow("resource type does not match");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a resource outside the authenticated user's Cloudinary folder", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: "users/43/video-1",
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video", format: "mp4", bytes: 1024,
      },
    })).rejects.toThrow("ownership verification failed");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a resource with a format that does not match the declared MIME", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.webm",
        resource_type: "video", format: "webm", bytes: 1024,
      },
    })).rejects.toThrow("resource format does not match");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a resource with a missing or invalid size", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video", format: "mp4", bytes: 0,
      },
    })).rejects.toThrow("size verification failed");
    expect(create).not.toHaveBeenCalled();
  });
});
