import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCampaign } from "@/lib/marketing/campaigns";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId)) return Response.json({ error: "Invalid campaign id" }, { status: 400 });

  try {
    const campaign = await getCampaign(Number((session.user as any).id), campaignId);
    if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
    return Response.json({ campaign });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}
