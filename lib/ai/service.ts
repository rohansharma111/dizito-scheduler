import { imageGenerator } from "./imageGenerator";

import { mediaCloudinary } from "@/lib/media/cloudinary";

import { mediaRepository } from "@/lib/media/repository";

import { CreateMediaInput } from "@/lib/media/types";

export interface GenerateAIImageInput {
  userId: number;

  prompt: string;

  size?: "1024x1024" | "1024x1536" | "1536x1024";

  quality?: "low" | "medium" | "high";
}

export class AIService {
  async generateImage({
    userId,
    prompt,
    size = "1024x1024",
    quality = "medium",
  }: GenerateAIImageInput) {
    /*
      Generate image using OpenAI
    */

    const generated = await imageGenerator.generate({
      prompt,
      size,
      quality,
    });

    /*
      Upload to Cloudinary
    */

    const upload = await mediaCloudinary.upload({
      userId,

      buffer: generated.buffer,

      mimeType: generated.mimeType,

      fileName: `ai-${Date.now()}.png`,
    });

    /*
      Save to media library
    */

    const media: CreateMediaInput = {
      userId,

      cloudinaryPublicId: upload.publicId,

      originalName: "AI Generated",

      fileName: `AI ${new Date().toISOString()}`,

      secureUrl: upload.secureUrl,

      format: upload.format,

      mimeType: generated.mimeType,

      width: upload.width,

      height: upload.height,

      bytes: upload.bytes,

      resourceType: upload.resourceType,

      folder: upload.folder,

      tags: ["ai-generated"],
    };

    return mediaRepository.create(media);
  }
}

export const aiService = new AIService();
