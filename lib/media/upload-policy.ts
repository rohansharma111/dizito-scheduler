export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 1024 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-m4v"]);

export function getUploadPolicy(mimeType: string, size: number) {
  const normalized = mimeType.toLowerCase();

  if (IMAGE_MIME_TYPES.has(normalized)) {
    return size > IMAGE_MAX_BYTES
      ? { allowed: false as const, error: "Image exceeds Dizito's 25 MB upload limit." }
      : { allowed: true as const, resourceType: "image" as const };
  }

  if (VIDEO_MIME_TYPES.has(normalized)) {
    return size > VIDEO_MAX_BYTES
      ? { allowed: false as const, error: "Video exceeds Dizito's 1 GB upload limit." }
      : { allowed: true as const, resourceType: "video" as const };
  }

  return { allowed: false as const, error: "Unsupported media MIME type." };
}
