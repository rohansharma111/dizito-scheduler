import OpenAI from "openai";
import { buildGenerateWeekContext } from "@/lib/marketing/generateWeek";

export type CreateMarketingCopyInput = {
  contentType: string;
  format: string;
  topic: string;
  angle?: string;
  hook?: string;
  cta?: string;
  campaignName?: string;
  campaignObjective?: string;
  audience?: string;
  productIds?: number[];
  offerId?: number | null;
};

export async function generateMarketingCopy(userId: number, input: CreateMarketingCopyInput) {
  const context = await buildGenerateWeekContext(userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.OPENAI_CREATOR_MODEL || process.env.OPENAI_STRATEGY_MODEL || "gpt-5-mini",
    input: [
      {
        role: "system",
        content: "You are Dizito's controlled AI Creator. Write publish-ready social marketing copy using only the supplied business context and content brief. Never invent product claims, prices, discounts, customer facts, URLs, guarantees, features, or offers. Keep the copy natural and concise. Return ONLY valid JSON with a body string. Do not publish or schedule anything.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Create the social post body for this content item.",
          outputSchema: { body: "string" },
          contentBrief: input,
          context,
        }),
      },
    ],
  });

  const cleaned = response.output_text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.body !== "string" || !parsed.body.trim()) {
    throw new Error("Invalid AI Creator response");
  }

  return { body: parsed.body.trim() };
}
