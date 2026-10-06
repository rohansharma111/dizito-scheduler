import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMarketingExperiments } from "@/lib/marketing/experiments";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });
  const campaignParam = new URL(request.url).searchParams.get("campaignId");
  const campaignId = campaignParam ? Number(campaignParam) : undefined;
  if (campaignParam && (!Number.isInteger(campaignId) || (campaignId as number) <= 0)) return Response.json({ error: "Invalid campaignId" }, { status: 400 });
  try {
    return Response.json({ experiments: await listMarketingExperiments(userId, undefined, campaignId) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load experiments" }, { status: 500 });
  }
}
