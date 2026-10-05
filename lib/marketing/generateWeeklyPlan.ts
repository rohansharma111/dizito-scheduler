import { getBusinessBrain } from "@/lib/marketing/businessBrain";

export type GeneratedWeek = {
  weekStart: string;
  weekEnd: string;
  strategySummary: string;
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
    offerId: number | null;
    rationale: string;
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

export async function generateWeeklyPlan(userId: number, weekStart: string): Promise<GeneratedWeek> {
  const brain = await getBusinessBrain(userId);
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid weekStart");

  const activeGoals = brain.goals.filter((goal) => goal.status === "active");
  const activeOffers = brain.offers.filter((offer) => offer.status === "active" || offer.status === "draft");
  const channels = brain.socialAccounts.filter((account) => account.status === "active").map((account) => account.platform);
  const suggestedChannels = [...new Set(channels)];
  const primaryGoal = activeGoals[0] ?? null;
  const product = brain.products[0] ?? null;
  const media = brain.media[0] ?? null;
  const offer = activeOffers[0] ?? null;

  const objective = primaryGoal?.name ?? "Build awareness and drive customer action";
  const goalType = primaryGoal?.goalType ?? "awareness";
  const productName = product?.name ?? "your business";
  const businessName = brain.profile?.businessName ?? "your business";
  const offerText = offer ? ` with ${offer.name}` : "";

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
      suggestedChannels,
      productId: product?.id ?? null,
      mediaId: media?.id ?? null,
      offerId: offer?.id ?? null,
      rationale: primaryGoal
        ? `Prioritizes the active goal “${primaryGoal.name}” and reuses available business context before creating new assets.`
        : "Uses available products and media to create a balanced week until a primary marketing goal is configured.",
    };
  });

  return {
    weekStart,
    weekEnd: isoDate(addDays(start, 6)),
    strategySummary: `A five-post draft week focused on ${objective.toLowerCase()}, using existing products, offers, media and connected channels where available. This is a recommendation draft and is not published automatically.`,
    recommendations,
    context: {
      goalIds: activeGoals.map((goal) => goal.id),
      offerIds: activeOffers.map((offer) => offer.id),
      productIds: brain.products.map((item) => item.id),
      mediaIds: brain.media.map((item) => item.id),
    },
  };
}
