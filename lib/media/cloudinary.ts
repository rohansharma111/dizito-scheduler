import { v2 as cloudinary } from "cloudinary";
import { UploadMediaInput, UploadMediaResult } from "./types";

export class MediaCloudinary {
  async upload({
    buffer,
    fileName,
    mimeType,
    userId,
  }: UploadMediaInput): Promise<UploadMediaResult> {
    const folder = `users/${userId}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          filename_override: fileName,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error);
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            width: result.width ?? null,
            height: result.height ?? null,
            bytes: result.bytes,
            format: result.format,
            resourceType: result.resource_type,
            folder,
          });
        },
      );

      stream.end(buffer);
    });
  }

  async delete(publicId: string) {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  }
}

export const mediaCloudinary = new MediaCloudinary();
