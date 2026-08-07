import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateImageInput {
  prompt: string;

  size?: "1024x1024" | "1024x1536" | "1536x1024";

  quality?: "low" | "medium" | "high";
}

export interface GenerateImageResult {
  buffer: Buffer;

  mimeType: string;
}

export class ImageGenerator {
  async generate({
    prompt,
    size = "1024x1024",
    quality = "medium",
  }: GenerateImageInput): Promise<GenerateImageResult> {
    if (!prompt.trim()) {
      throw new Error("Prompt is required");
    }

    const response = await openai.images.generate({
      model: "gpt-image-1",

      prompt,

      size,

      quality,

      n: 1,
    });

    const image = response.data?.[0];

    if (!image?.b64_json) {
      throw new Error("Image generation failed");
    }

    const buffer = Buffer.from(image.b64_json, "base64");

    return {
      buffer,

      mimeType: "image/png",
    };
  }
}

export const imageGenerator = new ImageGenerator();
