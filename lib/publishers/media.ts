import { mediaService } from "@/lib/media/service";
import { getMediaCapability, resolvePublishMediaType, type PublishMediaKind } from "@/lib/media/capabilities";

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

  if (capability.mimeTypes.length && media.mime_type && !capability.mimeTypes.includes(media.mime_type)) {
    throw new Error(`MIME type ${media.mime_type} is not supported for ${platform}`);
  }

  if (capability.maxBytes !== null && media.bytes && media.bytes > capability.maxBytes) {
    throw new Error(`Media exceeds the ${platform} size limit`);
  }

  if (
    capability.minDurationSeconds !== null &&
    media.duration_seconds !== null &&
    media.duration_seconds !== undefined &&
    media.duration_seconds < capability.minDurationSeconds
  ) {
    throw new Error(`Video is shorter than the ${platform} minimum duration`);
  }

  if (
    capability.maxDurationSeconds !== null &&
    media.duration_seconds !== null &&
    media.duration_seconds !== undefined &&
    media.duration_seconds > capability.maxDurationSeconds
  ) {
    throw new Error(`Video exceeds the ${platform} maximum duration`);
  }

  return { media, mediaType: mediaType as PublishMediaKind, capability };
}
