import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { listCampaigns } from "@/lib/marketing/campaigns";

export type GeneratedWeek = {
  weekStart: string;
  weekEnd: string;
  strategySummary: string;
  experiment: { hypothesis: string; change: string; metric: string; disposition: "refine" | "retest" | "avoid" | "measure"; selectionReason: string } | null;
  recommendations: Array<{
    day: string;
    objective: string;
    contentType: string;
    topic: string;
    hook: string;
    cta: string;
    suggestedChannels: string[];
    productId: number | null;
    mediaId: number | null;
    sourceCampaignId: number | null;
    offerId: number | null;
    rationale: string;
    supportingExperimentIds: number[];
    evidence: { sourceType: "content_item" | "variant"; sourceId: number; actionType: string; count: number; value: number; platform: string | null } | null;
  }>;
  context: {
    goalIds: number[];
    offerIds: number[];
    productIds: number[];
    mediaIds: number[];
  };
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type StrategyHint = {
  strategySummary?: string;
  recommendations?: Array<{ action?: string; why?: string; channels?: string[]; goalId?: number | null; campaignId?: number | null; productIds?: number[]; offerId?: number | null }>;
  optimization?: {
    summary?: string;
    opportunities?: Array<{ action?: string; rationale?: string; priority?: string; campaignId?: number | null; contentItemId?: number | null; variantId?: number | null; supportingExperimentIds?: number[]; observedOutcome?: { actionType?: string; count?: number; value?: number; platform?: string | null } | null }>;
    experiments?: Array<{ hypothesis?: string; change?: string; metric?: string; disposition?: "refine" | "retest" | "avoid" | "measure" }>;
  };
};

export async function generateWeeklyPlan(userId: number, weekStart: string, strategyHint?: StrategyHint): Promise<GeneratedWeek> {
  const [brain, campaigns] = await Promise.all([getBusinessBrain(userId), listCampaigns(userId)]);
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid weekStart");

  const activeGoals = brain.goals.filter((goal) => goal.status === "active");
  const activeOffers = brain.offers.filter((offer) => offer.status === "active" || offer.status === "draft");
  const channels = brain.socialAccounts.filter((account) => account.status === "active").map((account) => account.platform);
  const suggestedChannels = [...new Set(channels)];
  const primaryGoal = activeGoals[0] ?? null;
  const strategyRecommendations = Array.isArray(strategyHint?.recommendations) ? strategyHint.recommendations : [];
  const optimizationOpportunities = Array.isArray(strategyHint?.optimization?.opportunities) ? strategyHint.optimization.opportunities : [];
  // The optimizer returns opportunities in deterministic evidence-score order. Preserve that order here so the weekly planner uses the highest-evidence recommendation rather than re-ranking by LLM priority labels.
  const optimizationOpportunity = optimizationOpportunities[0] ?? null;
  const optimizationExperiments = Array.isArray(strategyHint?.optimization?.experiments) ? strategyHint.optimization.experiments : [];
  // Dispositions are deterministic optimizer output. Never carry an avoid experiment into a new weekly plan.
  // Prefer historically directional refinements/retests, then measurement when evidence is insufficient.
  const dispositionRank: Record<"refine" | "retest" | "measure" | "avoid", number> = {
    refine: 0,
    retest: 1,
    measure: 2,
    avoid: 3,
  };
  const optimizationExperiment = optimizationExperiments
    .filter((item) => item.hypothesis && item.change && item.metric && (item.disposition ?? "measure") !== "avoid")
    .slice()
    .sort((a, b) => (dispositionRank[a.disposition ?? "measure"] ?? 2) - (dispositionRank[b.disposition ?? "measure"] ?? 2))[0] ?? null;
  const supportingExperimentIds = Array.isArray(optimizationOpportunity?.supportingExperimentIds)
    ? optimizationOpportunity.supportingExperimentIds.map(Number).filter(Number.isFinite)
    : [];
  const strategyRecommendation = strategyRecommendations[0];
  const sourceCampaign = strategyRecommendation?.campaignId != null
    ? campaigns.find((campaign) => campaign.id === Number(strategyRecommendation.campaignId)) ?? null
    : null;
  const strategyGoal = strategyRecommendation?.goalId != null
    ? activeGoals.find((goal) => goal.id === Number(strategyRecommendation.goalId)) ?? null
    : null;
  const strategyProduct = strategyRecommendation?.productIds?.length
    ? brain.products.find((item) => item.id === Number(strategyRecommendation.productIds[0])) ?? null
    : null;
  const strategyOffer = strategyRecommendation?.offerId != null
    ? activeOffers.find((offer) => offer.id === Number(strategyRecommendation.offerId)) ?? null
    : null;
  const product = brain.products[0] ?? null;
  const media = brain.media[0] ?? null;
  const offer = activeOffers[0] ?? null;

  const objective = optimizationOpportunity?.action || strategyRecommendation?.action || strategyGoal?.name || primaryGoal?.name || "Build awareness and drive customer action";
  const goalType = strategyGoal?.goalType ?? primaryGoal?.goalType ?? "awareness";
  const selectedProduct = strategyProduct ?? product;
  const selectedOffer = strategyOffer ?? offer;
  const productName = selectedProduct?.name ?? "your business";
  const businessName = brain.profile?.businessName ?? "your business";
  const offerText = selectedOffer ? ` with ${selectedOffer.name}` : "";

  const templates = [
    { contentType: "educational", topic: `${productName}: useful tips and benefits`, hook: `A simple way to get more value from ${productName}`, cta: goalType === "sales" ? "Shop now" : "Learn more" },
    { contentType: "product", topic: `${productName} spotlight${offerText}`, hook: `Why customers choose ${productName}`, cta: offer ? "Claim the offer" : "Explore the product" },
    { contentType: "social_proof", topic: "Customer proof and trust", hook: "What customers value most about working with us", cta: goalType === "reviews" ? "Leave a review" : "Message us" },
    { contentType: "behind_the_scenes", topic: `${businessName} behind the scenes`, hook: "A look at what goes into serving our customers", cta: "Follow along" },
    { contentType: "conversion", topic: `${productName} and next step`, hook: "Ready to take the next step?", cta: goalType === "booking" ? "Book now" : goalType === "lead" ? "Enquire today" : "Get started" },
  ];

  const recommendations = templates.map((template, index) => {
    const day = isoDate(addDays(start, index));
    return {
      day,
      objective,
      contentType: template.contentType,
      topic: template.topic,
      hook: template.hook,
      cta: template.cta,
      suggestedChannels: strategyRecommendation?.channels?.length
        ? [...new Set(strategyRecommendation.channels.map(String).filter((channel) => suggestedChannels.includes(channel)))]
        : suggestedChannels,
      productId: selectedProduct?.id ?? null,
      mediaId: media?.id ?? null,
      sourceCampaignId: sourceCampaign?.id ?? null,
      offerId: selectedOffer?.id ?? null,
      supportingExperimentIds,
      rationale: optimizationOpportunity?.rationale
        ? `Optimization focus: ${optimizationOpportunity.rationale}${optimizationOpportunity.contentItemId != null ? ` This was informed by content item ${optimizationOpportunity.contentItemId}.` : ""}${optimizationOpportunity.variantId != null ? ` This was informed by variant ${optimizationOpportunity.variantId}.` : ""}`
        : primaryGoal
          ? `Prioritizes the active goal “${primaryGoal.name}” and reuses available business context before creating new assets.`
          : "Uses available products and media to create a balanced week until a primary marketing goal is configured.",
      evidence: optimizationOpportunity?.observedOutcome?.actionType && typeof optimizationOpportunity.observedOutcome.count === "number" && typeof optimizationOpportunity.observedOutcome.value === "number"
        ? { sourceType: optimizationOpportunity.variantId != null ? "variant" : "content_item", sourceId: Number(optimizationOpportunity.variantId ?? optimizationOpportunity.contentItemId), actionType: String(optimizationOpportunity.observedOutcome.actionType), count: Number(optimizationOpportunity.observedOutcome.count), value: Number(optimizationOpportunity.observedOutcome.value), platform: optimizationOpportunity.observedOutcome.platform ?? null }
        : null
    };
  });

  return {
    weekStart,
    weekEnd: isoDate(addDays(start, 6)),
    experiment: optimizationExperiment
      ? { hypothesis: String(optimizationExperiment.hypothesis), change: String(optimizationExperiment.change), metric: String(optimizationExperiment.metric), disposition: optimizationExperiment.disposition ?? "measure", selectionReason: optimizationExperiment.disposition === "refine" ? "Selected because the optimizer found directionally positive historical evidence to build on." : optimizationExperiment.disposition === "retest" ? "Selected because the optimizer recommends a narrower or better-measured retest after an unfavorable historical direction." : "Selected as a measurement-first experiment because directional historical evidence is insufficient." }
      : null,
    strategySummary: strategyHint?.optimization?.summary
      ? strategyHint.optimization.summary + " The weekly plan turns the optimization recommendation into a reviewable execution draft; nothing is published automatically."
      : strategyHint?.strategySummary
        ? strategyHint.strategySummary + " The weekly plan turns that recommendation into a reviewable execution draft; nothing is published automatically."
        : `A five-post draft week focused on ${objective.toLowerCase()}, using existing products, offers, media and connected channels where available. This is a recommendation draft and is not published automatically.`,
    recommendations,
    context: {
      goalIds: activeGoals.map((goal) => goal.id),
      offerIds: activeOffers.map((offer) => offer.id),
      productIds: brain.products.map((item) => item.id),
      mediaIds: brain.media.map((item) => item.id),
    },
  };
}
