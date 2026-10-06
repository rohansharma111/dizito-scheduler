import OpenAI from "openai";
import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { getBusinessImpact } from "@/lib/marketing/businessImpact";
import { listCampaigns } from "@/lib/marketing/campaigns";

export type MarketingStrategy = {
  strategySummary: string;
  priorities: Array<{ priority: string; rationale: string; goalId: number | null; campaignId: number | null }>;
  recommendations: Array<{ action: string; why: string; channels: string[]; goalId: number | null; campaignId: number | null; productIds: number[]; offerId: number | null }>;
  measurementPlan: Array<{ metric: string; reason: string }>;
  guardrails: string[];
};

export async function generateMarketingStrategy(userId: number): Promise<MarketingStrategy> {
  const [businessBrain, businessImpact, campaigns] = await Promise.all([
    getBusinessBrain(userId),
    getBusinessImpact(userId),
    listCampaigns(userId),
  ]);
  const context = { businessBrain, businessImpact, campaigns: campaigns.slice(0, 25) };
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_STRATEGY_MODEL || process.env.OPENAI_CREATOR_MODEL || "gpt-5-mini",
    input: [
      { role: "system", content: "You are Dizito's controlled AI Marketing Strategist. Build a practical marketing strategy only from the supplied business context and observed outcomes. Never invent products, offers, customer facts, prices, performance, claims, audiences, URLs, or capabilities. Treat missing data as unknown. Distinguish observed outcomes from explicit attribution; do not infer causality. Prefer active goals, available products/offers, connected channels, and evidence from completed customer actions. Recommendations are advisory only. Do not publish, schedule, mutate commerce, or create database records. Return ONLY valid JSON." },
      { role: "user", content: JSON.stringify({
        task: "Create the current recommended marketing strategy for this business.",
        outputSchema: {
          strategySummary: "string",
          priorities: [{ priority: "string", rationale: "string", goalId: "number|null", campaignId: "number|null" }],
          recommendations: [{ action: "string", why: "string", channels: ["string"], goalId: "number|null", campaignId: "number|null", productIds: ["number"], offerId: "number|null" }],
          measurementPlan: [{ metric: "string", reason: "string" }],
          guardrails: ["string"],
        },
        context,
      }) },
    ],
  });
  const cleaned = response.output_text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as MarketingStrategy;
  if (!parsed || typeof parsed.strategySummary !== "string" || !Array.isArray(parsed.priorities) || !Array.isArray(parsed.recommendations) || !Array.isArray(parsed.measurementPlan) || !Array.isArray(parsed.guardrails)) throw new Error("Invalid AI Strategist response");

  const goalIds = new Set(businessBrain.goals.map((goal) => goal.id));
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const productIds = new Set(businessBrain.products.map((product) => product.id));
  const offerIds = new Set(businessBrain.offers.map((offer) => offer.id));

  return {
    strategySummary: parsed.strategySummary.trim(),
    priorities: parsed.priorities.slice(0, 5).map((item) => ({
      priority: String(item.priority), rationale: String(item.rationale),
      goalId: item.goalId != null && goalIds.has(Number(item.goalId)) ? Number(item.goalId) : null,
      campaignId: item.campaignId != null && campaignIds.has(Number(item.campaignId)) ? Number(item.campaignId) : null,
    })),
    recommendations: parsed.recommendations.slice(0, 8).map((item) => ({
      action: String(item.action), why: String(item.why),
      channels: Array.isArray(item.channels) ? item.channels.map(String).slice(0, 5) : [],
      goalId: item.goalId != null && goalIds.has(Number(item.goalId)) ? Number(item.goalId) : null,
      campaignId: item.campaignId != null && campaignIds.has(Number(item.campaignId)) ? Number(item.campaignId) : null,
      productIds: Array.isArray(item.productIds) ? item.productIds.map(Number).filter((id) => productIds.has(id)).slice(0, 10) : [],
      offerId: item.offerId != null && offerIds.has(Number(item.offerId)) ? Number(item.offerId) : null,
    })),
    measurementPlan: parsed.measurementPlan.slice(0, 8).map((item) => ({ metric: String(item.metric), reason: String(item.reason) })),
    guardrails: parsed.guardrails.slice(0, 8).map(String),
  };
}