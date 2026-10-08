import { describe, expect, it } from "vitest";
import { getMediaCapability, resolvePublishMediaType } from "@/lib/media/capabilities";
import { validatePublishMedia, type PublishMedia } from "@/lib/publishers/media";

describe("media capability resolution", () => {
  it("keeps images supported for existing publishers", () => {
    expect(resolvePublishMediaType("facebook", { resource_type: "image", mime_type: "image/jpeg" })).toBe("image");
    expect(resolvePublishMediaType("instagram", { resource_type: "image", mime_type: "image/jpeg" })).toBe("image");
    expect(resolvePublishMediaType("pinterest", { resource_type: "image", mime_type: "image/jpeg" })).toBe("image");
    expect(resolvePublishMediaType("linkedin", { resource_type: "image", mime_type: "image/jpeg" })).toBe("image");
  });

  it("maps video to platform-native types instead of image", () => {
    expect(resolvePublishMediaType("instagram", { resource_type: "video", mime_type: "video/mp4" })).toBe("reel");
    expect(resolvePublishMediaType("pinterest", { resource_type: "video", mime_type: "video/mp4" })).toBe("video_pin");
    expect(resolvePublishMediaType("facebook", { resource_type: "video", mime_type: "video/mp4" })).toBeNull();
    expect(resolvePublishMediaType("linkedin", { resource_type: "video", mime_type: "video/mp4" })).toBe("video");
  });

  it("does not claim Local Post video support", () => {
    expect(resolvePublishMediaType("google_business_local_post", { resource_type: "video", mime_type: "video/mp4" })).toBeNull();
    expect(resolvePublishMediaType("google_business_location_media", { resource_type: "video", mime_type: "video/mp4" })).toBeNull();
  });

  it("requires a Pinterest video cover", () => {
    expect(getMediaCapability("pinterest", "video_pin")?.requiresCover).toBe(true);
  });

  it("fails closed for partially verified Facebook video", () => {
    expect(getMediaCapability("facebook", "video")).toBeNull();
  });

  it("fails closed when verified video metadata needed for constraints is missing", () => {
    const capability = getMediaCapability("instagram", "reel");
    const media = {
      secure_url: "https://example.test/video.mp4",
      resource_type: "video",
      mime_type: null,
      bytes: null,
      duration_seconds: null,
      width: null,
      height: null,
    } satisfies PublishMedia;

    expect(() => validatePublishMedia(media, capability!)).toThrow("MIME type is required");
  });

  it("enforces verified video byte and duration limits", () => {
    const capability = getMediaCapability("linkedin", "video");
    const base = {
      secure_url: "https://example.test/video.mp4",
      resource_type: "video",
      mime_type: "video/mp4",
      bytes: 500 * 1024 * 1024,
      duration_seconds: 3,
      width: 1920,
      height: 1080,
    } satisfies PublishMedia;

    expect(() => validatePublishMedia(base, capability!)).not.toThrow();
    expect(() => validatePublishMedia({ ...base, bytes: base.bytes! + 1 }, capability!)).toThrow("size limit");
    expect(() => validatePublishMedia({ ...base, duration_seconds: 30 * 60 + 1 }, capability!)).toThrow("maximum duration");
  });

  it("enforces configured dimension bounds when a capability has them", () => {
    const capability = getMediaCapability("google_business_location_media", "image");
    const media = {
      secure_url: "https://example.test/image.jpg",
      resource_type: "image",
      mime_type: "image/jpeg",
      bytes: 1024,
      width: 249,
      height: 300,
    } satisfies PublishMedia;

    expect(() => validatePublishMedia(media, capability!)).toThrow("minimum");
  });

  it("records LinkedIn's verified video constraints", () => {
    const capability = getMediaCapability("linkedin", "video");
    expect(capability?.maxBytes).toBe(500 * 1024 * 1024);
    expect(capability?.minDurationSeconds).toBe(3);
    expect(capability?.maxDurationSeconds).toBe(30 * 60);
  });
});
