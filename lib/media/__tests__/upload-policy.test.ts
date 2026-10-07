import { describe, expect, it } from "vitest";
import { getUploadPolicy } from "@/lib/media/upload-policy";

describe("media upload policy", () => {
  it("accepts supported image MIME types within the image ingress limit", () => {
    expect(getUploadPolicy("image/jpeg", 1024).allowed).toBe(true);
  });

  it("accepts large video through the direct-upload policy", () => {
    expect(getUploadPolicy("video/mp4", 500 * 1024 * 1024).allowed).toBe(true);
  });

  it("rejects unsupported MIME types", () => {
    expect(getUploadPolicy("application/pdf", 1024).allowed).toBe(false);
  });

  it("rejects video above the application ingress cap", () => {
    expect(getUploadPolicy("video/mp4", 1024 * 1024 * 1024 + 1).allowed).toBe(false);
  });
});
