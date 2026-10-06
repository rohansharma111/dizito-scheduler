import OpenAI from "openai";
import { getMarketingStrategyContext } from "@/lib/marketing/strategyContext";

export type MarketingOptimization = {
  summary: string;
  opportunities: Array<{ action: string; rationale: string; campaignId: number | null; contentItemId: number | null; variantId: number | null; priority: "high" | "medium" | "low" }>;
  experiments: Array<{ hypothesis: string; change: string; metric: string }>;
  measurement: Array<{ metric: string; reason: string }>;
  guardrails: string[];
};

export async function generateMarketingOptimization(userId: number): Promise<MarketingOptimization> {
  const context = await getMarketingStrategyContext(userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_STRATEGY_MODEL || process.env.OPENAI_CREATOR_MODEL || "gpt-5-mini",
    input: [
      { role: "system", content: "You are Dizito's controlled AI Marketing Optimizer. Use only supplied business context, observed completed customer actions, and explicit manual attribution. Never claim causality from observational data. Never invent performance, customers, products, offers, prices, audiences, URLs, or capabilities. Treat missing data as unknown. Recommendations are advisory only: do not publish, schedule, mutate campaigns, change commerce, or create records. Prefer measurable, reversible improvements and small experiments. Return ONLY valid JSON." },
      { role: "user", content: JSON.stringify({
        task: "Analyze current marketing outcomes and recommend the highest-value improvements for future campaigns and weekly plans.",
        outputSchema: { summary: "string", opportunities: [{ action: "string", rationale: "string", campaignId: "number|null", contentItemId: "number|null", variantId: "number|null", priority: "high|medium|low" }], experiments: [{ hypothesis: "string", change: "string", metric: "string" }], measurement: [{ metric: "string", reason: "string" }], guardrails: ["string"] },
        context,
      }) },
    ],
  });
  const cleaned = response.output_text.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as MarketingOptimization;
  if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.opportunities) || !Array.isArray(parsed.experiments) || !Array.isArray(parsed.measurement) || !Array.isArray(parsed.guardrails)) throw new Error("Invalid AI Optimizer response");
  const campaignIds = new Set(context.campaigns.map((campaign) => campaign.id));
  const validPriorities = new Set(["high", "medium", "low"]);
  return {
    summary: parsed.summary.trim(),
    opportunities: parsed.opportunities.slice(0, 8).map((item) => ({ action: String(item.action), rationale: String(item.rationale), campaignId: item.campaignId != null && campaignIds.has(Number(item.campaignId)) ? Number(item.campaignId) : null, contentItemId: item.contentItemId != null ? Number(item.contentItemId) : null, variantId: item.variantId != null ? Number(item.variantId) : null, priority: validPriorities.has(String(item.priority)) ? item.priority : "medium" })),
    experiments: parsed.experiments.slice(0, 6).map((item) => ({ hypothesis: String(item.hypothesis), change: String(item.change), metric: String(item.metric) })),
    measurement: parsed.measurement.slice(0, 8).map((item) => ({ metric: String(item.metric), reason: String(item.reason) })),
    guardrails: parsed.guardrails.slice(0, 8).map(String),
  };
}