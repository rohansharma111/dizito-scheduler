import { mediaRepository } from "./repository";
import { mediaCloudinary } from "./cloudinary";
import { CreateMediaInput, CompleteDirectUploadInput, UploadMediaInput } from "./types";

export class MediaService {
  async uploadMedia(input: UploadMediaInput) {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error("File is empty");
    }

    if (input.mimeType.startsWith("video/")) {
      throw new Error("Video uploads must use the signed direct Cloudinary upload flow");
    }

    const uploadResult = await mediaCloudinary.upload(input);

    const media: CreateMediaInput = {
      userId: input.userId,
      cloudinaryPublicId: uploadResult.publicId,
      originalName: input.fileName,
      fileName: input.fileName,
      secureUrl: uploadResult.secureUrl,
      format: uploadResult.format,
      mimeType: input.mimeType,
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

    const resourceType = resource.resource_type ?? (input.mimeType.startsWith("video/") ? "video" : "image");
    if (resourceType !== "video" && resourceType !== "image") {
      throw new Error("Unsupported Cloudinary resource type");
    }

    const media: CreateMediaInput = {
      userId: input.userId,
      cloudinaryPublicId: resource.public_id,
      originalName: input.fileName,
      fileName: input.fileName,
      secureUrl: resource.secure_url,
      format: resource.format ?? "",
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
