import { isMarketingAIEnabled } from "@/lib/marketing/aiAvailability";

export async function GET() {
  return Response.json({ enabled: isMarketingAIEnabled() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
