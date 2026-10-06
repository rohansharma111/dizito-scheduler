import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { getBusinessImpact } from "@/lib/marketing/businessImpact";
import { listCampaigns } from "@/lib/marketing/campaigns";
import { listContentItems } from "@/lib/marketing/contentItems";

export type MarketingStrategyContext = Awaited<ReturnType<typeof getBusinessBrain>> & {
  impact: Awaited<ReturnType<typeof getBusinessImpact>>;
  campaigns: Awaited<ReturnType<typeof listCampaigns>>;
  contentItems: Awaited<ReturnType<typeof listContentItems>>;
};

export async function getMarketingStrategyContext(userId: number): Promise<MarketingStrategyContext> {
  const [businessBrain, impact, campaigns, contentItems] = await Promise.all([
    getBusinessBrain(userId),
    getBusinessImpact(userId),
    listCampaigns(userId),
    listContentItems(userId),
  ]);
  return { ...businessBrain, impact, campaigns: campaigns.slice(0, 25), contentItems: contentItems.slice(0, 50) };
}
