import { mediaRepository } from "./repository";
import { mediaCloudinary } from "./cloudinary";
import { CreateMediaInput, CompleteDirectUploadInput, UploadMediaInput } from "./types";
import { getUploadPolicy } from "./upload-policy";
import { matchesDeclaredMediaType } from "../security/media-signature";

export class MediaService {
  async uploadMedia(input: UploadMediaInput) {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error("File is empty");
    }

    const normalizedMimeType = input.mimeType.trim().toLowerCase();
    const uploadPolicy = getUploadPolicy(normalizedMimeType, input.buffer.length);
    if (!uploadPolicy.allowed) {
      throw new Error(uploadPolicy.error);
    }
    if (uploadPolicy.resourceType !== "image") {
      throw new Error("Video uploads must use the signed direct Cloudinary upload flow");
    }
    if (!matchesDeclaredMediaType(input.buffer, normalizedMimeType)) {
      throw new Error("File content does not match the declared media type");
    }

    const normalizedInput = { ...input, mimeType: normalizedMimeType };
    const uploadResult = await mediaCloudinary.upload(normalizedInput);

    const media: CreateMediaInput = {
      userId: input.userId,
      cloudinaryPublicId: uploadResult.publicId,
      originalName: input.fileName,
      fileName: input.fileName,
      secureUrl: uploadResult.secureUrl,
      format: uploadResult.format,
      mimeType: normalizedMimeType,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      resourceType: uploadResult.resourceType,
      folder: uploadResult.folder,
      tags: [],
      processingState: "ready",
      uploadProtocol: "server_proxy",
    };

    return mediaRepository.create(media);
  }

  async completeDirectUpload(input: CompleteDirectUploadInput) {
    const resource = input.resource;
    if (!resource?.public_id || resource.public_id !== input.publicId || !resource.secure_url) {
      throw new Error("Cloudinary resource verification failed");
    }

    const expectedPrefix = `users/${input.userId}/`;
    if (!resource.public_id.startsWith(expectedPrefix) || resource.public_id === expectedPrefix) {
      throw new Error("Cloudinary resource ownership verification failed");
    }

    const normalizedMimeType = input.mimeType.trim().toLowerCase();
    const expectedResourceType = normalizedMimeType.startsWith("video/") ? "video" : "image";
    const resourceType = resource.resource_type;
    if (resourceType !== expectedResourceType) {
      throw new Error("Cloudinary resource type does not match the declared media type");
    }

    const format = String(resource.format ?? "").toLowerCase();
    const allowedFormats: Record<string, Set<string>> = {
      "image/jpeg": new Set(["jpg", "jpeg"]),
      "image/png": new Set(["png"]),
      "image/webp": new Set(["webp"]),
      "video/mp4": new Set(["mp4"]),
      "video/quicktime": new Set(["mov", "mp4"]),
      "video/x-m4v": new Set(["m4v", "mp4"]),
    };
    const formats = allowedFormats[normalizedMimeType];
    if (!formats || !formats.has(format)) {
      throw new Error("Cloudinary resource format does not match the declared media type");
    }

    const uploadPolicy = getUploadPolicy(normalizedMimeType, resource.bytes as number);
    if (!uploadPolicy.allowed || uploadPolicy.resourceType !== resourceType) {
      throw new Error("Cloudinary resource size or upload policy verification failed");
    }

    const media: CreateMediaInput = {
      userId: input.userId,
      cloudinaryPublicId: resource.public_id,
      originalName: input.fileName,
      fileName: input.fileName,
      secureUrl: resource.secure_url,
      format: format,
      mimeType: input.mimeType,
      width: resource.width ?? null,
      height: resource.height ?? null,
      bytes: resource.bytes ?? 0,
      resourceType,
      folder: resource.folder ?? `users/${input.userId}`,
      tags: [],
      durationSeconds: resource.duration ?? null,
      posterUrl:
        resourceType === "video"
          ? mediaCloudinary.videoPosterUrl(resource.public_id)
          : null,
      processingState: "ready",
      uploadProtocol: input.uploadProtocol ?? "cloudinary_signed_direct",
      metadata: {
        cloudinary: {
          publicId: resource.public_id,
          resourceType,
          format: resource.format ?? null,
        },
      },
    };

    return mediaRepository.create(media);
  }

  async getMedia(id: number, userId: number) {
    return mediaRepository.findById(id, userId);
  }

  async listMedia(userId: number) {
    return mediaRepository.listByUser(userId);
  }

  async deleteMedia(id: number, userId: number) {
    return mediaRepository.softDelete(id, userId);
  }

  async getStorageUsed(userId: number) {
    return mediaRepository.getStorageUsed(userId);
  }
}

export const mediaService = new MediaService();
