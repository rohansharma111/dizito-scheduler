import OpenAI from "openai";
import { buildGenerateWeekContext } from "@/lib/marketing/generateWeek";

export type WeeklyStrategy = {
  strategySummary: string;
  campaigns: Array<{
    name: string;
    objective: string;
    audience: string;
    offerId: number | null;
    productIds: number[];
    cta: string;
    channelStrategy: Record<string, unknown>;
    contentItems: Array<{
      contentType: string;
      format: string;
      topic: string;
      angle: string;
      hook: string;
      cta: string;
      plannedFor: string | null;
    }>;
  }>;
};

function extractJson(text: string): WeeklyStrategy {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.strategySummary !== "string" || !Array.isArray(parsed.campaigns)) {
    throw new Error("Invalid weekly strategy response");
  }
  return parsed;
}

export async function generateWeeklyStrategy(userId: number): Promise<WeeklyStrategy> {
  const context = await buildGenerateWeekContext(userId);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.OPENAI_STRATEGY_MODEL || "gpt-5-mini",
    input: [
      {
        role: "system",
        content: `You are Dizito's controlled marketing strategy planner. Create a practical weekly plan for a small business from the supplied business context. Never invent products, offers, assets, channels, metrics, or facts. Prefer existing products and assets. Return ONLY valid JSON matching the requested structure. Do not publish, schedule, or perform actions. Keep the plan concise and executable.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Create this week's marketing strategy.",
          outputSchema: {
            strategySummary: "string",
            campaigns: [
              {
                name: "string",
                objective: "string",
                audience: "string",
                offerId: "number|null",
                productIds: "number[]",
                cta: "string",
                channelStrategy: "object",
                contentItems: [
                  {
                    contentType: "string",
                    format: "string",
                    topic: "string",
                    angle: "string",
                    hook: "string",
                    cta: "string",
                    plannedFor: "YYYY-MM-DD|null",
                  },
                ],
              },
            ],
          },
          context,
        }),
      },
    ],
  });

  return extractJson(response.output_text);
}
