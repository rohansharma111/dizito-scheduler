import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMarketingOptimization } from "@/lib/marketing/optimizer";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });
  try { return Response.json({ optimization: await generateMarketingOptimization(userId) }); }
  catch (error) { console.error(error); return Response.json({ error: "Failed to generate marketing optimization" }, { status: 500 }); }
}