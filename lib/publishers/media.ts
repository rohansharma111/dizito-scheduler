import { mediaService } from "@/lib/media/service";
import { getMediaCapability, resolvePublishMediaType, type MediaConstraints, type PublishMediaKind } from "@/lib/media/capabilities";

export interface PublishMedia {
  id?: number;
  secure_url: string;
  file_name?: string | null;
  poster_url?: string | null;
  resource_type: "image" | "video";
  mime_type?: string | null;
  media_type?: string | null;
  bytes?: number | null;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
}

export function validatePublishMedia(media: PublishMedia, capability: MediaConstraints): void {
  if (capability.mimeTypes.length) {
    if (!media.mime_type || !capability.mimeTypes.includes(media.mime_type)) {
      throw new Error(
        media.mime_type
          ? `MIME type ${media.mime_type} is not supported for this media capability`
          : "Media MIME type is required for publishing",
      );
    }
  }

  if (capability.maxBytes !== null) {
    if (media.bytes === null || media.bytes === undefined || media.bytes <= 0) {
      throw new Error("Media byte size is required for publishing");
    }
    if (media.bytes > capability.maxBytes) {
      throw new Error("Media exceeds the configured size limit");
    }
  }

  if (capability.minDurationSeconds !== null) {
    if (media.duration_seconds === null || media.duration_seconds === undefined) {
      throw new Error("Video duration is required for publishing");
    }
    if (media.duration_seconds < capability.minDurationSeconds) {
      throw new Error("Video is shorter than the configured minimum duration");
    }
  }

  if (capability.maxDurationSeconds !== null) {
    if (media.duration_seconds === null || media.duration_seconds === undefined) {
      throw new Error("Video duration is required for publishing");
    }
    if (media.duration_seconds > capability.maxDurationSeconds) {
      throw new Error("Video exceeds the configured maximum duration");
    }
  }

  if (capability.minWidth !== null) {
    if (media.width === null || media.width === undefined) {
      throw new Error("Media width is required for publishing");
    }
    if (media.width < capability.minWidth) {
      throw new Error("Media width is below the configured minimum");
    }
  }

  if (capability.maxWidth !== null) {
    if (media.width === null || media.width === undefined) {
      throw new Error("Media width is required for publishing");
    }
    if (media.width > capability.maxWidth) {
      throw new Error("Media width exceeds the configured maximum");
    }
  }

  if (capability.minHeight !== null) {
    if (media.height === null || media.height === undefined) {
      throw new Error("Media height is required for publishing");
    }
    if (media.height < capability.minHeight) {
      throw new Error("Media height is below the configured minimum");
    }
  }

  if (capability.maxHeight !== null) {
    if (media.height === null || media.height === undefined) {
      throw new Error("Media height is required for publishing");
    }
    if (media.height > capability.maxHeight) {
      throw new Error("Media height exceeds the configured maximum");
    }
  }
}

export async function resolvePostMedia(context: { post: any; account: any }, platform: string) {
  const post = context.post;
  let media: PublishMedia | null = null;

  if (post.media_id && post.user_id) {
    const stored = await mediaService.getMedia(Number(post.media_id), Number(post.user_id));
    if (stored?.secure_url) {
      media = stored as PublishMedia;
    }
  }

  if (!media && post.secure_url) {
    media = {
      secure_url: post.secure_url,
      file_name: post.file_name ?? null,
      resource_type: post.resource_type === "video" ? "video" : "image",
      mime_type: post.mime_type ?? null,
      media_type: post.media_type ?? null,
      poster_url: post.poster_url ?? null,
      duration_seconds: post.duration_seconds ?? null,
      width: post.width ?? null,
      height: post.height ?? null,
      bytes: post.bytes ?? null,
    };
  }

  if (!media) return null;

  const mediaType = resolvePublishMediaType(platform, media);
  if (!mediaType) {
    throw new Error(`Unsupported ${media.resource_type} media for ${platform}`);
  }

  const capability = getMediaCapability(platform, mediaType);
  if (!capability) {
    throw new Error(`Media capability is fail-closed for ${platform}:${mediaType}`);
  }

  try {
    validatePublishMedia(media, capability);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media validation failed";
    throw new Error(`${platform} media validation failed: ${message}`);
  }

  return { media, mediaType: mediaType as PublishMediaKind, capability };
}
