import { describe, expect, it } from "vitest";
import { getMediaCapability, resolvePublishMediaType } from "@/lib/media/capabilities";

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
    expect(resolvePublishMediaType("facebook", { resource_type: "video", mime_type: "video/mp4" })).toBe("video");
    expect(resolvePublishMediaType("linkedin", { resource_type: "video", mime_type: "video/mp4" })).toBe("video");
  });

  it("does not claim Local Post video support", () => {
    expect(resolvePublishMediaType("google_business_local_post", { resource_type: "video", mime_type: "video/mp4" })).toBeNull();
    expect(resolvePublishMediaType("google_business_location_media", { resource_type: "video", mime_type: "video/mp4" })).toBeNull();
  });

  it("requires a Pinterest video cover", () => {
    expect(getMediaCapability("pinterest", "video_pin")?.requiresCover).toBe(true);
  });

  it("records LinkedIn's verified video constraints", () => {
    const capability = getMediaCapability("linkedin", "video");
    expect(capability?.maxBytes).toBe(500 * 1024 * 1024);
    expect(capability?.minDurationSeconds).toBe(3);
    expect(capability?.maxDurationSeconds).toBe(30 * 60);
  });
});
