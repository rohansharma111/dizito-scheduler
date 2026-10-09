import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, findByCloudinaryPublicId, upload, videoPosterUrl } = vi.hoisted(() => ({
  create: vi.fn(),
  findByCloudinaryPublicId: vi.fn(),
  upload: vi.fn(),
  videoPosterUrl: vi.fn(() => "https://res.cloudinary.com/example/video/upload/poster.jpg"),
}));

vi.mock("./repository", () => ({
  mediaRepository: { create, findByCloudinaryPublicId },
}));

vi.mock("./cloudinary", () => ({
  mediaCloudinary: { upload, videoPosterUrl },
}));

import { MediaService } from "./service";

describe("MediaService.uploadMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: 1 });
    findByCloudinaryPublicId.mockResolvedValue(null);
    upload.mockResolvedValue({ publicId: "users/42/image-1", secureUrl: "https://res.cloudinary.com/example/image/upload/image-1.jpg", width: 10, height: 10, bytes: 3, format: "jpg", resourceType: "image", folder: "users/42" });
  });

  it("rejects unsupported image sizes before calling Cloudinary", async () => {
    const service = new MediaService();
    await expect(service.uploadMedia({
      userId: 42, fileName: "large.jpg", mimeType: "image/jpeg",
      buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
    })).rejects.toThrow("25 MB upload limit");
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects declared MIME types that do not match the file signature", async () => {
    const service = new MediaService();
    await expect(service.uploadMedia({
      userId: 42, fileName: "fake.jpg", mimeType: "image/jpeg",
      buffer: Buffer.from("not a jpeg"),
    })).rejects.toThrow("File content does not match");
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("normalizes MIME before calling Cloudinary", async () => {
    const service = new MediaService();
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    await expect(service.uploadMedia({
      userId: 42, fileName: "image.jpg", mimeType: " IMAGE/JPEG ",
      buffer: jpeg,
    })).resolves.toEqual({ id: 1 });
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg", buffer: jpeg }));
  });
});

describe("MediaService.completeDirectUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: 1 });
    findByCloudinaryPublicId.mockResolvedValue(null);
    upload.mockResolvedValue({ publicId: "users/42/image-1", secureUrl: "https://res.cloudinary.com/example/image/upload/image-1.jpg", width: 10, height: 10, bytes: 3, format: "jpg", resourceType: "image", folder: "users/42" });
  });

  const baseInput = {
    userId: 42,
    publicId: "users/42/media/video-1",
    fileName: "video.mp4",
    mimeType: "video/mp4",
    uploadProtocol: "cloudinary_signed_direct" as const,
  };

  it("returns the existing media record when completion is retried", async () => {
    const existing = { id: 7, cloudinary_public_id: baseInput.publicId };
    findByCloudinaryPublicId.mockResolvedValue(existing);
    const service = new MediaService();

    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video",
        format: "mp4",
        bytes: 1024,
      },
    })).resolves.toEqual(existing);
    expect(create).not.toHaveBeenCalled();
  });

  it("validates provider metadata before returning an existing record on retry", async () => {
    findByCloudinaryPublicId.mockResolvedValue({ id: 7, cloudinary_public_id: baseInput.publicId });
    const service = new MediaService();

    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.webm",
        resource_type: "video",
        format: "webm",
        bytes: 1024,
      },
    })).rejects.toThrow("resource format does not match");
    expect(findByCloudinaryPublicId).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

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
      publicId: "users/43/video-1",
      resource: {
        public_id: "users/43/video-1",
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video", format: "mp4", bytes: 1024,
      },
    })).rejects.toThrow("Cloudinary resource ownership verification failed");
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

  it("rejects direct uploads outside the shared byte-size policy", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video", format: "mp4", bytes: 1024 * 1024 * 1024 + 1,
      },
    })).rejects.toThrow("upload policy verification failed");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects fractional Cloudinary byte counts", async () => {
    const service = new MediaService();
    await expect(service.completeDirectUpload({
      ...baseInput,
      resource: {
        public_id: baseInput.publicId,
        secure_url: "https://res.cloudinary.com/example/video/upload/video-1.mp4",
        resource_type: "video", format: "mp4", bytes: 1.5,
      },
    })).rejects.toThrow("upload policy verification failed");
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
    })).rejects.toThrow("upload policy verification failed");
    expect(create).not.toHaveBeenCalled();
  });
});
