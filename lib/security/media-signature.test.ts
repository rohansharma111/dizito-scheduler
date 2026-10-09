import { describe, expect, it } from "vitest";
import { matchesDeclaredMediaType } from "./media-signature";

describe("matchesDeclaredMediaType", () => {
  it("accepts valid JPEG, PNG, GIF, WebM, MP4, and QuickTime signatures", () => {
    expect(matchesDeclaredMediaType(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from("RIFF0000WEBP", "ascii"), "image/webp")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from("GIF89a", "ascii"), "image/gif")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "video/webm")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00]), "video/mp4")).toBe(true);
    expect(matchesDeclaredMediaType(Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0x00]), "video/quicktime")).toBe(true);
  });

  it("normalizes MIME type whitespace and casing", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    expect(matchesDeclaredMediaType(jpeg, " IMAGE/JPEG ")).toBe(true);
  });

  it("rejects mismatched content and unsupported types", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(matchesDeclaredMediaType(png, "image/jpeg")).toBe(false);
    expect(matchesDeclaredMediaType(png, "application/octet-stream")).toBe(false);
    expect(matchesDeclaredMediaType(Buffer.from("not-an-image"), "image/png")).toBe(false);
  });
});
