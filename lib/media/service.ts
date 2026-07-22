import { mediaRepository } from "./repository";
import { mediaCloudinary } from "./cloudinary";
import { CreateMediaInput, UploadMediaInput } from "./types";

export class MediaService {
  async uploadMedia(input: UploadMediaInput) {
    if (!input.buffer || input.buffer.length === 0) {
      throw new Error("File is empty");
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
