import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWeeklyStrategy } from "@/lib/marketing/strategy";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.DIZITO_AI_ENABLED !== "true") return Response.json({ error: "AI weekly strategy is coming soon. Use the template-based weekly planner instead.", code: "AI_COMING_SOON" }, { status: 503 });

  const userId = Number((session.user as any).id);
  const rateLimit = await consumeRateLimit({ bucket: "ai:weekly-strategy", identifier: `user:${userId}`, limit: 5, windowSeconds: 300 });
  if (!rateLimit.allowed) return Response.json({ error: "Too many weekly strategy requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });

  try {
    const strategy = await generateWeeklyStrategy(Number((session.user as any).id));
    return Response.json({ strategy });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate weekly strategy" }, { status: 500 });
  }
}
