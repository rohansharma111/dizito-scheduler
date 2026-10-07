export type MediaKind = "image" | "video";
export type PublishMediaKind =
  | "image"
  | "video"
  | "carousel"
  | "reel"
  | "story"
  | "video_pin";

export type MediaUploadProtocol = "server_proxy" | "cloudinary_signed_direct";

export type MediaProcessingState =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

export interface MediaConstraints {
  mimeTypes: readonly string[];
  maxBytes: number | null;
  minDurationSeconds: number | null;
  maxDurationSeconds: number | null;
  minWidth: number | null;
  maxWidth: number | null;
  minHeight: number | null;
  maxHeight: number | null;
  requiresProcessing: boolean;
  requiresPolling: boolean;
  requiresCover: boolean;
  uploadProtocol: MediaUploadProtocol;
  verification: "verified" | "partially_verified" | "fail_closed";
  notes?: string;
}

export interface PlatformMediaCapability {
  platform: string;
  mediaTypes: Partial<Record<PublishMediaKind, MediaConstraints>>;
}

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/x-m4v"] as const;

const directVideoUpload: MediaUploadProtocol = "cloudinary_signed_direct";

export const MEDIA_CAPABILITIES: Record<string, PlatformMediaCapability> = {
  instagram: {
    platform: "instagram",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
      },
      reel: {
        mimeTypes: VIDEO_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: 3,
        maxDurationSeconds: 900,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: true,
        requiresPolling: true,
        requiresCover: false,
        uploadProtocol: directVideoUpload,
        verification: "partially_verified",
        notes: "Meta container processing must reach FINISHED before media_publish.",
      },
    },
  },
  facebook: {
    platform: "facebook",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
      },
      video: {
        mimeTypes: VIDEO_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: true,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: directVideoUpload,
        verification: "partially_verified",
        notes: "Page video publishing uses a video-specific upload path; processing continues on the provider after the create call.",
      },
    },
  },
  pinterest: {
    platform: "pinterest",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
      },
      video_pin: {
        mimeTypes: ["video/mp4", "video/quicktime", "video/x-m4v"],
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: true,
        requiresPolling: true,
        requiresCover: true,
        uploadProtocol: directVideoUpload,
        verification: "verified",
        notes: "Pinterest requires media registration/upload/status polling and a cover image URL.",
      },
    },
  },
  linkedin: {
    platform: "linkedin",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
      },
      video: {
        mimeTypes: ["video/mp4"],
        maxBytes: 500 * 1024 * 1024,
        minDurationSeconds: 3,
        maxDurationSeconds: 30 * 60,
        minWidth: null,
        maxWidth: null,
        minHeight: null,        maxHeight: null,
        requiresProcessing: true,
        requiresPolling: true,
        requiresCover: false,
        uploadProtocol: directVideoUpload,
        verification: "partially_verified",
        notes: "LinkedIn's current Videos API uses initializeUpload/upload/finalize before Posts API publication.",
      },
    },
  },
  google_business_local_post: {
    platform: "google_business_local_post",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
        notes: "LocalPost media is treated as photo/sourceUrl media. Do not advertise generic Local Post video support.",
      },
    },
  },
  google_business_location_media: {
    platform: "google_business_location_media",
    mediaTypes: {
      image: {
        mimeTypes: IMAGE_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: false,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: "cloudinary_signed_direct",
        verification: "verified",
      },
      video: {
        mimeTypes: VIDEO_MIME_TYPES,
        maxBytes: null,
        minDurationSeconds: null,
        maxDurationSeconds: null,
        minWidth: null,
        maxWidth: null,
        minHeight: null,
        maxHeight: null,
        requiresProcessing: true,
        requiresPolling: false,
        requiresCover: false,
        uploadProtocol: directVideoUpload,
        verification: "verified",
        notes: "Google Business Profile location media supports VIDEO; this is distinct from Local Posts.",
      },
    },
  },
};

export function getMediaCapability(
  platform: string,
  mediaType: PublishMediaKind,
): MediaConstraints | null {
  const capability = MEDIA_CAPABILITIES[platform]?.mediaTypes[mediaType];
  if (!capability || capability.verification === "fail_closed") {
    return null;
  }
  return capability;
}

export function resolvePublishMediaType(
  platform: string,
  media: { resource_type?: string | null; mime_type?: string | null; media_type?: string | null },
): PublishMediaKind | null {
  const resourceType = media.resource_type?.toLowerCase();
  const explicit = media.media_type?.toLowerCase();

  if (explicit === "reel" && getMediaCapability(platform, "reel")) return "reel";
  if (explicit === "video_pin" && getMediaCapability(platform, "video_pin")) return "video_pin";
  if (explicit === "story" && getMediaCapability(platform, "story")) return "story";

  if (resourceType === "video") {
    if (platform === "instagram" && getMediaCapability(platform, "reel")) return "reel";
    if (platform === "pinterest" && getMediaCapability(platform, "video_pin")) return "video_pin";
    if (getMediaCapability(platform, "video")) return "video";
    return null;
  }

  if (resourceType === "image" || media.mime_type?.startsWith("image/")) {
    return getMediaCapability(platform, "image") ? "image" : null;
  }

  return null;
}
