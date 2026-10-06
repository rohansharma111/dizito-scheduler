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
  const contentItems = context.contentItems;
  const contentItemIds = new Set(contentItems.map((item) => item.id));
  const variantRows = await Promise.all(contentItems.slice(0, 50).map(async (item) => {    const result = await (await import("@/lib/db")).pool.query("SELECT id, content_item_id AS \"contentItemId\" FROM marketing_content_item_variants WHERE user_id = $1 AND content_item_id = $2", [userId, item.id]);    return result.rows;  }));
  const variantById = new Map<number, number>(variantRows.flat().map((row) => [Number(row.id), Number(row.contentItemId)]));
  const validPriorities = new Set(["high", "medium", "low"]);
  return {
    summary: parsed.summary.trim(),
    opportunities: parsed.opportunities.slice(0, 8).map((item) => ({ action: String(item.action), rationale: String(item.rationale), campaignId: item.campaignId != null && campaignIds.has(Number(item.campaignId)) ? Number(item.campaignId) : null, contentItemId: item.contentItemId != null && contentItemIds.has(Number(item.contentItemId)) ? Number(item.contentItemId) : null, variantId: item.variantId != null && variantById.has(Number(item.variantId)) && (item.contentItemId == null || variantById.get(Number(item.variantId)) === Number(item.contentItemId)) ? Number(item.variantId) : null, priority: validPriorities.has(String(item.priority)) ? item.priority : "medium" })),
    experiments: parsed.experiments.slice(0, 6).map((item) => ({ hypothesis: String(item.hypothesis), change: String(item.change), metric: String(item.metric) })),
    measurement: parsed.measurement.slice(0, 8).map((item) => ({ metric: String(item.metric), reason: String(item.reason) })),
    guardrails: parsed.guardrails.slice(0, 8).map(String),
  };
}