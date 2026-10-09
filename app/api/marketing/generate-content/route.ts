import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMarketingCopy } from "@/lib/marketing/creator";
import { MARKETING_PLATFORMS } from "@/lib/marketing/contentVariants";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.DIZITO_AI_ENABLED !== "true") return Response.json({ error: "AI copy generation is coming soon. You can write and edit post copy manually.", code: "AI_COMING_SOON" }, { status: 503 });

  try {
    const body = await request.json();
    if (!body.contentType || !body.format || (body.contentItemId == null && !body.topic)) return Response.json({ error: "contentType, format and topic are required" }, { status: 400 });
    const platform = body.platform == null ? undefined : String(body.platform);
    if (platform && !(MARKETING_PLATFORMS as readonly string[]).includes(platform)) return Response.json({ error: "Unsupported platform" }, { status: 400 });

    const userId = Number((session.user as any).id);
    const rateLimit = await consumeRateLimit({ bucket: "ai:creator", identifier: `user:${userId}`, limit: 20, windowSeconds: 60 });
    if (!rateLimit.allowed) return Response.json({ error: "Too many AI generation requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });
    if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });

    const copy = await generateMarketingCopy(userId, {
      contentType: String(body.contentType), format: String(body.format), topic: String(body.topic),
      angle: body.angle ? String(body.angle) : undefined, hook: body.hook ? String(body.hook) : undefined,
      cta: body.cta ? String(body.cta) : undefined, campaignName: body.campaignName ? String(body.campaignName) : undefined,
      campaignObjective: body.campaignObjective ? String(body.campaignObjective) : undefined, audience: body.audience ? String(body.audience) : undefined,
      productIds: Array.isArray(body.productIds) ? body.productIds.map(Number) : [], contentItemId: body.contentItemId == null ? undefined : Number(body.contentItemId), offerId: body.offerId == null ? null : Number(body.offerId), platform: platform as any,
    });
    return Response.json({ copy });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Invalid content item reference" || message === "Content item not found" || message === "Invalid product reference" || message === "Invalid offer reference" || message === "Unsupported marketing platform" || message === "Invalid AI Creator response") {
      return Response.json({ error: message }, { status: message === "Invalid AI Creator response" ? 422 : 400 });
    }
    return Response.json({ error: "Failed to generate marketing copy" }, { status: 500 });
  }
}
