import OpenAI from "openai";
import { getMarketingStrategyContext } from "@/lib/marketing/strategyContext";
import { listContentVariantsForContentItems } from "@/lib/marketing/contentVariants";

export type MarketingOptimization = {
  summary: string;
  completedExperimentEvidence: Array<{
    experimentId: number;
    name: string;
    hypothesis: string;
    change: string;
    metric: string;
    resultSummary: string | null;
    outcomes: Array<{ actionType: string; count: number; value: number }>;
    metricEvidence: Array<{ actionType: string; count: number; value: number }>;
    baselineOutcomes: Array<{ actionType: string; count: number; value: number }>;
    baselineComparison: { actionType: string; experimentCount: number; baselineCount: number; countChange: number; countChangePercent: number | null; experimentValue: number; baselineValue: number; valueChange: number; valueChangePercent: number | null } | null;
  }>;
  opportunities: Array<{ action: string; rationale: string; campaignId: number | null; contentItemId: number | null; variantId: number | null; priority: "high" | "medium" | "low"; observedOutcome: { actionType: string; count: number; value: number; platform: string | null } | null; supportingExperimentIds: number[] }>;
  experiments: Array<{ hypothesis: string; change: string; metric: string }>;
  measurement: Array<{ metric: string; reason: string }>;
  guardrails: string[];
};

export async function generateMarketingOptimization(userId: number): Promise<MarketingOptimization> {
  const context = await getMarketingStrategyContext(userId);
  const outcomeGuidance = context.impact.observedContentSummary.length || context.impact.observedVariantSummary.length
    ? "Observed outcome data exists at content/variant level. Use it to prioritize measurable recommendations, while explicitly describing it as observed rather than causal."
    : "No completed content/variant-level customer action outcomes are available. Treat content/variant performance as unknown and recommend measurement before claiming improvement.";
  const experimentGuidance = context.completedExperiments.length
    ? "Completed experiment evidence is available. Use each experiment's hypothesis, change, metric, observed outcomes, baseline window outcomes, and result summary as historical evidence. Baseline comparisons are descriptive historical context, not controls or causal estimates. Prefer recommendations that build on clearly observed experiment results, but never treat completion or correlation as causal proof."
    : "No completed experiments are available. Do not imply that a tested change has already been validated; recommend a measurable experiment when evidence is insufficient.";

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_STRATEGY_MODEL || process.env.OPENAI_CREATOR_MODEL || "gpt-5-mini",
    input: [
      { role: "system", content: "You are Dizito's controlled AI Marketing Optimizer. Use only supplied business context, observed completed customer actions, and explicit manual attribution. Never claim causality from observational data. Never invent performance, customers, products, offers, prices, audiences, URLs, or capabilities. Treat missing data as unknown. Recommendations are advisory only: do not publish, schedule, mutate campaigns, change commerce, or create records. Prefer measurable, reversible improvements and small experiments. Return ONLY valid JSON." },
      { role: "user", content: JSON.stringify({
        task: "Analyze current marketing outcomes and recommend the highest-value improvements for future campaigns and weekly plans. Prefer content-item and variant-level recommendations when observed outcomes support them. Use manual attribution only as explicit attribution, never as causal proof. When proposing experiments, use completed experiment history to extend, refine, or deliberately retest a prior hypothesis; do not blindly repeat an already-tested change. If a prior experiment has no useful observed outcome, recommend a better measurement design rather than claiming the prior change worked or failed.",
        outputSchema: { summary: "string", opportunities: [{ action: "string", rationale: "string", campaignId: "number|null", contentItemId: "number|null", variantId: "number|null", priority: "high|medium|low" }], experiments: [{ hypothesis: "string", change: "string", metric: "string" }], measurement: [{ metric: "string", reason: "string" }], guardrails: ["string"] },
        context: { ...context, optimizerOutcomeGuidance: outcomeGuidance, optimizerExperimentGuidance: experimentGuidance },
      }) },
    ],
  });
  const cleaned = response.output_text.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as MarketingOptimization;
  if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.opportunities) || !Array.isArray(parsed.experiments) || !Array.isArray(parsed.measurement) || !Array.isArray(parsed.guardrails)) throw new Error("Invalid AI Optimizer response");
  const campaignIds = new Set(context.campaigns.map((campaign) => campaign.id));
  const contentItems = context.contentItems;
  const contentItemIds = new Set(contentItems.map((item) => item.id));
  const variants = await listContentVariantsForContentItems(userId, contentItems.slice(0, 50).map((item) => item.id));
  const variantById = new Map<number, number>(variants.map((variant) => [variant.id, variant.contentItemId]));
  const validPriorities = new Set(["high", "medium", "low"]);
  const completedExperiments = context.completedExperiments;
  const experimentComparisons = new Map(completedExperiments.map((experiment) => {
    const metricOutcome = experiment.metricEvidence[0] ?? null;
    const baselineOutcome = metricOutcome ? experiment.baselineOutcomes.find((item) => item.actionType === metricOutcome.actionType) ?? null : null;
    const countPercent = metricOutcome && baselineOutcome && baselineOutcome.count > 0
      ? ((metricOutcome.count - baselineOutcome.count) / baselineOutcome.count) * 100
      : null;
    const valuePercent = metricOutcome && baselineOutcome && baselineOutcome.value > 0
      ? ((metricOutcome.value - baselineOutcome.value) / baselineOutcome.value) * 100
      : null;
    return [experiment.id, { countPercent, valuePercent }] as const;
  }));
  const rankedOpportunities = parsed.opportunities.slice(0, 20).map((item, index) => {
    const variantId = item.variantId != null ? Number(item.variantId) : null;
    const contentItemId = item.contentItemId != null ? Number(item.contentItemId) : null;
    const campaignId = item.campaignId != null ? Number(item.campaignId) : null;
    const supportingExperimentIds = completedExperiments
      .filter((experiment) =>
        (experiment.variantId != null && variantId != null && experiment.variantId === variantId)
        || (experiment.variantId == null && experiment.contentItemId != null && contentItemId != null && experiment.contentItemId === contentItemId)
        || (experiment.variantId == null && experiment.contentItemId == null && experiment.campaignId != null && campaignId != null && experiment.campaignId === campaignId),
      )
      .map((experiment) => experiment.id);
    const observedOutcome = (() => {
      const variantOutcome = variantId != null ? context.impact.observedVariantSummary.find((outcome) => outcome.variantId === variantId) : null;
      const contentOutcome = contentItemId != null ? context.impact.observedContentSummary.find((outcome) => outcome.contentItemId === contentItemId) : null;
      const outcome = variantOutcome || contentOutcome;
      return outcome ? { actionType: outcome.actionType, count: outcome.count, value: outcome.value, platform: "platform" in outcome ? outcome.platform : null } : null;
    })();
    const comparisons = supportingExperimentIds.map((id) => experimentComparisons.get(id)).filter(Boolean);
    const strongestComparison = comparisons.find((comparison) => comparison?.valuePercent != null) ?? comparisons.find((comparison) => comparison?.countPercent != null) ?? null;
    const evidenceScore = Math.round(
      Math.max(0, Math.min(100,
        (observedOutcome ? Math.min(35, observedOutcome.count * 5) : 0)
        + (observedOutcome && observedOutcome.value > 0 ? 15 : 0)
        + (strongestComparison?.countPercent != null ? Math.min(25, Math.max(-10, strongestComparison.countPercent) / 4) : 0)
        + (strongestComparison?.valuePercent != null ? Math.min(25, Math.max(-10, strongestComparison.valuePercent) / 4) : 0)
        + (supportingExperimentIds.length ? 10 : 0),
      )),
    );
    return { item, index, campaignId, contentItemId, variantId, supportingExperimentIds, observedOutcome, evidenceScore };
  }).sort((a, b) => b.evidenceScore - a.evidenceScore || a.index - b.index);
  return {
    summary: parsed.summary.trim(),
    completedExperimentEvidence: context.completedExperiments.map((experiment) => {
      const metricOutcome = experiment.metricEvidence[0] ?? null;
      const baselineOutcome = metricOutcome ? experiment.baselineOutcomes.find((item) => item.actionType === metricOutcome.actionType) ?? null : null;
      const countChange = metricOutcome && baselineOutcome ? metricOutcome.count - baselineOutcome.count : null;
      const valueChange = metricOutcome && baselineOutcome ? metricOutcome.value - baselineOutcome.value : null;
      return {
        experimentId: experiment.id,
      name: experiment.name,
      hypothesis: experiment.hypothesis,
      change: experiment.changeDescription,
      metric: experiment.metric,
      resultSummary: experiment.resultSummary,
      outcomes: experiment.outcomes.map((outcome) => ({
        actionType: outcome.actionType,
        count: outcome.count,
        value: outcome.value,
      })),
      metricEvidence: experiment.metricEvidence.map((outcome) => ({
        actionType: outcome.actionType,
        count: outcome.count,
        value: outcome.value,
      })),
      baselineOutcomes: experiment.baselineOutcomes.map((outcome) => ({
        actionType: outcome.actionType,
        count: outcome.count,
        value: outcome.value,
      })),
      baselineComparison: metricOutcome && baselineOutcome ? {
        actionType: metricOutcome.actionType,
        experimentCount: metricOutcome.count,
        baselineCount: baselineOutcome.count,
        countChange: countChange!,
        countChangePercent: baselineOutcome.count === 0 ? null : Number(((countChange! / baselineOutcome.count) * 100).toFixed(2)),
        experimentValue: metricOutcome.value,
        baselineValue: baselineOutcome.value,
        valueChange: valueChange!,
        valueChangePercent: baselineOutcome.value === 0 ? null : Number(((valueChange! / baselineOutcome.value) * 100).toFixed(2)),
      } : null,
      };
    }),
    opportunities: rankedOpportunities.slice(0, 8).map(({ item, campaignId, contentItemId, variantId, supportingExperimentIds, observedOutcome, evidenceScore }) => ({
      action: String(item.action),
      rationale: String(item.rationale),
      campaignId: campaignId != null && campaignIds.has(campaignId) ? campaignId : null,
      contentItemId: contentItemId != null && contentItemIds.has(contentItemId) ? contentItemId : null,
      variantId: variantId != null && variantById.has(variantId) && (contentItemId == null || variantById.get(variantId) === contentItemId) ? variantId : null,
      priority: evidenceScore >= 60 ? "high" : evidenceScore >= 30 ? "medium" : (validPriorities.has(String(item.priority)) ? item.priority : "low"),
      supportingExperimentIds,
      observedOutcome,
    })),
    experiments: parsed.experiments.slice(0, 6).map((item) => ({ hypothesis: String(item.hypothesis), change: String(item.change), metric: String(item.metric) })),
    measurement: parsed.measurement.slice(0, 8).map((item) => ({ metric: String(item.metric), reason: String(item.reason) })),
    guardrails: parsed.guardrails.slice(0, 8).map(String),
  };
}