import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const createMock = vi.fn();

vi.mock("openai", () => ({
  default: class OpenAI {
    responses = { create: createMock };
  },
}));

vi.mock("@/lib/db", () => ({
  pool: { query: queryMock },
}));

vi.mock("@/lib/marketing/generateWeek", () => ({
  buildGenerateWeekContext: vi.fn(async () => ({
    businessBrain: {
      profile: null,
      goals: [],
      offers: [{ id: 9, name: "Spring Offer", offerType: "discount", description: "Verified offer", terms: null, code: "SPRING", startsAt: null, endsAt: null, status: "active" }],
      products: [{ id: 7, name: "Verified Product", description: "Verified product description" }],
      inventory: [],
      media: [],
      socialAccounts: [],
      recentPosts: [],
    },
    assets: [],
    instructions: {},
  })),
}));

describe("marketing Creator grounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("rejects a content item that is not owned by the user", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const { generateMarketingCopy } = await import("@/lib/marketing/creator");
    await expect(generateMarketingCopy(42, {
      contentItemId: 100,
      contentType: "promotional",
      format: "post",
      topic: "Topic",
    })).rejects.toThrow("Content item not found");
  });

  it("uses server-resolved product and campaign offer references", async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 100,
        campaign_name: "Spring Campaign",
        campaign_objective: "Drive orders",
        campaign_audience: "Local buyers",
        campaign_cta: "Shop now",
        product_ids: [7],
        offer_id: 9,
      }],
    });
    createMock.mockImplementationOnce(async (request: { input: Array<{ content: string }> }) => {
      const payload = JSON.parse(request.input[1].content);
      expect(payload.contentBrief.productIds).toEqual([7]);
      expect(payload.contentBrief.offerId).toBe(9);
      expect(payload.contentBrief.grounding.campaign).toEqual({
        name: "Spring Campaign",
        objective: "Drive orders",
        audience: "Local buyers",
        cta: "Shop now",
      });
      expect(payload.contentBrief.grounding.selectedProducts).toEqual([
        { id: 7, name: "Verified Product", description: "Verified product description" },
      ]);
      expect(payload.contentBrief.grounding.selectedOffer.id).toBe(9);
      return { output_text: JSON.stringify({ body: "Verified draft" }) };
    });

    const { generateMarketingCopy } = await import("@/lib/marketing/creator");
    await expect(generateMarketingCopy(42, {
      contentItemId: 100,
      contentType: "promotional",
      format: "post",
      topic: "Topic",
      productIds: [999],
      offerId: 999,
    })).resolves.toEqual({ body: "Verified draft" });
  });

  it("fails closed when the model returns malformed JSON", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100, campaign_name: null, campaign_objective: null, campaign_audience: null, campaign_cta: null, product_ids: [], offer_id: null }] });
    createMock.mockResolvedValueOnce({ output_text: "{bad json" });
    const { generateMarketingCopy } = await import("@/lib/marketing/creator");
    await expect(generateMarketingCopy(42, {
      contentType: "promotional",
      format: "post",
      topic: "Topic",
    })).rejects.toThrow("Invalid AI Creator response");
  });

  it("fails closed when the model returns the wrong JSON shape", async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 100, campaign_name: null, campaign_objective: null, campaign_audience: null, campaign_cta: null, product_ids: [], offer_id: null }] });
    createMock.mockResolvedValueOnce({ output_text: JSON.stringify({ body: 123 }) });
    const { generateMarketingCopy } = await import("@/lib/marketing/creator");
    await expect(generateMarketingCopy(42, {
      contentType: "promotional",
      format: "post",
      topic: "Topic",
    })).rejects.toThrow("Invalid AI Creator response");
  });
});
