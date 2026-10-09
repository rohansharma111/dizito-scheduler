import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getContext: vi.fn(),
  listVariants: vi.fn(),
  learningSignal: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    responses = { create: mocks.create };
  },
}));
vi.mock("@/lib/marketing/strategyContext", () => ({
  getMarketingStrategyContext: mocks.getContext,
}));
vi.mock("@/lib/marketing/contentVariants", () => ({
  listContentVariantsForContentItems: mocks.listVariants,
}));
vi.mock("@/lib/marketing/experiments", () => ({
  getExperimentLearningSignal: mocks.learningSignal,
}));

import { generateMarketingOptimization } from "@/lib/marketing/optimizer";

describe("marketing optimizer evidence and disposition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      campaigns: [{ id: 10 }],
      contentItems: [{ id: 100 }],
      completedExperiments: [{
        id: 55,
        campaignId: 10,
        contentItemId: 100,
        variantId: 300,
        name: "Prior hook experiment",
        hypothesis: "A stronger hook increases orders",
        changeDescription: "Use a benefit-led hook",
        metric: "orders",
        resultSummary: "Orders increased in the experiment window.",
        outcomes: [{ actionType: "purchase", count: 4, value: 400 }],
        metricEvidence: [{ actionType: "purchase", count: 4, value: 400 }],
        baselineOutcomes: [{ actionType: "purchase", count: 2, value: 200 }],
      }],
      impact: {
        observedContentSummary: [],
        observedVariantSummary: [{ variantId: 300, actionType: "purchase", count: 4, value: 400, platform: "instagram" }],
        attributedContentSummary: [],
        attributedVariantSummary: [{ variantId: 300, actionType: "purchase", count: 1, attributedValue: 100, platform: "instagram" }],
      },
    });
    mocks.listVariants.mockResolvedValue([{ id: 300, contentItemId: 100 }]);
    mocks.learningSignal.mockReturnValue("positive");
    mocks.create.mockResolvedValue({
      output_text: JSON.stringify({
        summary: "Use the observed variant evidence to guide the next test.",
        opportunities: [{
          action: "Repeat the benefit-led direction with a new test",
          rationale: "The variant has observed outcomes and supporting experiment evidence.",
          campaignId: 10,
          contentItemId: 100,
          variantId: 300,
          priority: "high",
        }],
        experiments: [
          { hypothesis: "A stronger hook increases orders", change: "Use a benefit-led hook", metric: "orders" },
          { hypothesis: "A shorter CTA increases orders", change: "Use a shorter CTA", metric: "orders" },
        ],
        measurement: [{ metric: "orders", reason: "Track attributed customer actions." }],
        guardrails: ["Do not infer causality from observation."],
      }),
    });
  });

  it("returns observed and attributed evidence with supporting experiment provenance", async () => {
    const result = await generateMarketingOptimization(42);

    expect(result.opportunities[0]).toMatchObject({
      variantId: 300,
      contentItemId: 100,
      observedOutcome: { actionType: "purchase", count: 4, value: 400, platform: "instagram" },
      attributedOutcome: { actionType: "purchase", count: 1, value: 100, platform: "instagram" },
      supportingExperimentIds: [55],
      priority: "high",
    });
    expect(result.completedExperimentEvidence[0]).toMatchObject({
      experimentId: 55,
      learningSignal: "positive",
      baselineComparison: {
        experimentCount: 4,
        baselineCount: 2,
        countChange: 2,
        valueChange: 200,
      },
    });
  });

  it("deterministically disposes duplicate and directionally positive proposals", async () => {
    const result = await generateMarketingOptimization(42);

    expect(result.experiments).toEqual([
      {
        hypothesis: "A stronger hook increases orders",
        change: "Use a benefit-led hook",
        metric: "orders",
        disposition: "avoid",
      },
      {
        hypothesis: "A shorter CTA increases orders",
        change: "Use a shorter CTA",
        metric: "orders",
        disposition: "refine",
      },
    ]);
  });
});
