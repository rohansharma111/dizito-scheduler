import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMarketingStrategy } from "@/lib/marketing/strategist";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });
  const rateLimit = await consumeRateLimit({ bucket: "ai:strategist", identifier: `user:${userId}`, limit: 10, windowSeconds: 60 });
  if (!rateLimit.allowed) return Response.json({ error: "Too many strategy requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });
  try { return Response.json({ strategy: await generateMarketingStrategy(userId) }); }
  catch (error) { console.error(error); return Response.json({ error: "Failed to generate marketing strategy" }, { status: 500 }); }
}