import cloudinary from "@/lib/cloudinary";
import { UploadMediaInput, UploadMediaResult } from "./types";

export class MediaCloudinary {
  async upload({
    buffer,
    fileName,
    userId,
  }: UploadMediaInput): Promise<UploadMediaResult> {
    const folder = `users/${userId}`;

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          filename_override: fileName,
          overwrite: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload failed:", error);
            return reject(error);
          }

          if (!result) {
            return reject(new Error("Cloudinary returned no upload result"));
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

  async delete(
    publicId: string,
    resourceType: "image" | "video" | "raw" = "image",
  ) {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return result;
  }
}

export const mediaCloudinary = new MediaCloudinary();
