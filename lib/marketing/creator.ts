import OpenAI from "openai";
import { buildGenerateWeekContext } from "@/lib/marketing/generateWeek";
import { MARKETING_PLATFORMS, type MarketingPlatform } from "@/lib/marketing/contentVariants";

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
  platform?: MarketingPlatform;
};

export async function generateMarketingCopy(userId: number, input: CreateMarketingCopyInput) {
  const context = await buildGenerateWeekContext(userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const platform = input.platform;
  const selectedProductIds = [...new Set((input.productIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const selectedOfferId = input.offerId == null ? null : Number(input.offerId);
  if (selectedOfferId !== null && (!Number.isInteger(selectedOfferId) || selectedOfferId <= 0)) throw new Error("Invalid offer reference");
  const availableProductIds = new Set(context.businessBrain.products.map((product) => product.id));
  const invalidProductId = selectedProductIds.find((id) => !availableProductIds.has(id));
  if (invalidProductId !== undefined) throw new Error("Invalid product reference");
  if (selectedOfferId !== null && !context.businessBrain.offers.some((offer) => offer.id === selectedOfferId)) throw new Error("Invalid offer reference");
  if (platform && !(MARKETING_PLATFORMS as readonly string[]).includes(platform)) throw new Error("Unsupported marketing platform");

  const response = await client.responses.create({
    model: process.env.OPENAI_CREATOR_MODEL || process.env.OPENAI_STRATEGY_MODEL || "gpt-5-mini",
    input: [
      { role: "system", content: "You are Dizito's controlled AI Creator. Write publish-ready social marketing copy using only the supplied business context and content brief. Never invent product claims, prices, discounts, customer facts, URLs, guarantees, features, or offers. When a platform is supplied, adapt the copy to that platform's normal audience behavior and format without inventing platform capabilities. Keep the copy natural and concise. Return ONLY valid JSON with a body string. Do not publish or schedule anything." },
      { role: "user", content: JSON.stringify({ task: platform ? `Create the ${platform} version of this content item.` : "Create the social post body for this content item.", outputSchema: { body: "string" }, contentBrief: {
          ...input,
          productIds: selectedProductIds,
          offerId: selectedOfferId,
          grounding: {
            selectedProducts: context.businessBrain.products.filter((product) => selectedProductIds.includes(product.id)),
            selectedOffer: selectedOfferId === null ? null : context.businessBrain.offers.find((offer) => offer.id === selectedOfferId) || null,
          },
        },
        context }) },
    ],
  });

  const cleaned = response.output_text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.body !== "string" || !parsed.body.trim()) throw new Error("Invalid AI Creator response");
  return { body: parsed.body.trim() };
}
