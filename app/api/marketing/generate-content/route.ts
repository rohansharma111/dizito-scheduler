import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMarketingCopy } from "@/lib/marketing/creator";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.contentType || !body.format || !body.topic) {
      return Response.json({ error: "contentType, format and topic are required" }, { status: 400 });
    }

    const userId = Number((session.user as any).id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: "Invalid user" }, { status: 401 });
    }

    const copy = await generateMarketingCopy(userId, {
      contentType: String(body.contentType),
      format: String(body.format),
      topic: String(body.topic),
      angle: body.angle ? String(body.angle) : undefined,
      hook: body.hook ? String(body.hook) : undefined,
      cta: body.cta ? String(body.cta) : undefined,
      campaignName: body.campaignName ? String(body.campaignName) : undefined,
      campaignObjective: body.campaignObjective ? String(body.campaignObjective) : undefined,
      audience: body.audience ? String(body.audience) : undefined,
      productIds: Array.isArray(body.productIds) ? body.productIds.map(Number) : [],
      offerId: body.offerId == null ? null : Number(body.offerId),
    });

    return Response.json({ copy });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate marketing copy" }, { status: 500 });
  }
}
