import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { listMarketingAssets } from "@/lib/marketing/assets";

export async function buildGenerateWeekContext(userId: number) {
  const [businessBrain, assets] = await Promise.all([
    getBusinessBrain(userId),
    listMarketingAssets(userId),
  ]);

  return {
    businessBrain,
    assets,
    instructions: {
      objective: "Create a practical weekly marketing plan grounded in the business context.",
      reuseExistingAssets: true,
      reuseCanonicalProducts: true,
      doNotPublish: true,
    },
  };
}
