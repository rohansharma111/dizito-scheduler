import { describe, expect, it } from "vitest";
import {
  getUploadPolicy,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "./upload-policy";

describe("getUploadPolicy", () => {
  it("accepts supported image MIME types within the image limit", () => {
    expect(getUploadPolicy("image/jpeg", 1)).toEqual({
      allowed: true,
      resourceType: "image",
    });
    expect(getUploadPolicy(" image/png ", IMAGE_MAX_BYTES)).toEqual({
      allowed: true,
      resourceType: "image",
    });
    expect(getUploadPolicy("image/webp", IMAGE_MAX_BYTES + 1).allowed).toBe(false);
  });

  it("accepts supported video MIME types within the video limit", () => {
    expect(getUploadPolicy("video/mp4", 1)).toEqual({
      allowed: true,
      resourceType: "video",
    });
    expect(getUploadPolicy("video/quicktime", VIDEO_MAX_BYTES)).toEqual({
      allowed: true,
      resourceType: "video",
    });
    expect(getUploadPolicy("video/x-m4v", VIDEO_MAX_BYTES + 1).allowed).toBe(false);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid byte sizes: %s",
    (size) => {
      expect(getUploadPolicy("image/jpeg", size)).toEqual({
        allowed: false,
        error: "File size must be a positive whole number of bytes.",
      });
    },
  );

  it("rejects unsupported MIME types", () => {
    expect(getUploadPolicy("image/gif", 100)).toEqual({
      allowed: false,
      error: "Unsupported media MIME type.",
    });
  });
});
