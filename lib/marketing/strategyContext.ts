import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { getBusinessImpact } from "@/lib/marketing/businessImpact";
import { listCampaigns } from "@/lib/marketing/campaigns";

export type MarketingStrategyContext = Awaited<ReturnType<typeof getBusinessBrain>> & {
  impact: Awaited<ReturnType<typeof getBusinessImpact>>;
  campaigns: Awaited<ReturnType<typeof listCampaigns>>;
};

export async function getMarketingStrategyContext(userId: number): Promise<MarketingStrategyContext> {
  const [businessBrain, impact, campaigns] = await Promise.all([
    getBusinessBrain(userId),
    getBusinessImpact(userId),
    listCampaigns(userId),
  ]);
  return { ...businessBrain, impact, campaigns: campaigns.slice(0, 25) };
}
