import OpenAI from "openai";
import { pool } from "@/lib/db";
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
  contentItemId?: number;
  platform?: MarketingPlatform;
};

export async function generateMarketingCopy(userId: number, input: CreateMarketingCopyInput) {
  const context = await buildGenerateWeekContext(userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const platform = input.platform;
  let selectedProductIds = [...new Set((input.productIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  let selectedOfferId = input.offerId == null ? null : Number(input.offerId);
  if (input.contentItemId !== undefined) {
    if (!Number.isInteger(input.contentItemId) || input.contentItemId <= 0) throw new Error("Invalid content item reference");
    const item = await pool.query(
      `SELECT ci.id,
              mc.name AS campaign_name,
              mc.objective AS campaign_objective,
              mc.audience AS campaign_audience,
              mc.cta AS campaign_cta,
              COALESCE(ARRAY_AGG(DISTINCT cip.product_id) FILTER (WHERE cip.product_id IS NOT NULL), '{}') AS product_ids,
              mc.offer_id
         FROM marketing_content_items ci
         LEFT JOIN marketing_content_item_products cip ON cip.content_item_id = ci.id
         LEFT JOIN marketing_campaigns mc ON mc.id = ci.campaign_id AND mc.user_id = ci.user_id
        WHERE ci.id = $1 AND ci.user_id = $2
        GROUP BY ci.id, mc.offer_id`,
      [input.contentItemId, userId],
    );
    if (item.rowCount === 0) throw new Error("Content item not found");
    selectedProductIds = (item.rows[0].product_ids ?? []).map(Number);
    selectedOfferId = item.rows[0].offer_id == null ? null : Number(item.rows[0].offer_id);
  }
  const resolvedCampaign = input.contentItemId !== undefined ? {
    name: item.rows[0].campaign_name,
    objective: item.rows[0].campaign_objective,
    audience: item.rows[0].campaign_audience,
    cta: item.rows[0].campaign_cta,
  } : null;
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
            campaign: resolvedCampaign,
            selectedProducts: context.businessBrain.products.filter((product) => selectedProductIds.includes(product.id)),
            selectedOffer: selectedOfferId === null ? null : context.businessBrain.offers.find((offer) => offer.id === selectedOfferId) || null,
          },
        },
        context }) },
    ],
  });

  const cleaned = response.output_text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid AI Creator response");
  }
  if (!parsed || typeof parsed !== "object" || !("body" in parsed) || typeof parsed.body !== "string") {
    throw new Error("Invalid AI Creator response");
  }
  const body = parsed.body.trim();
  if (!body || body.length > 10000) throw new Error("Invalid AI Creator response");
  return { body };
}
