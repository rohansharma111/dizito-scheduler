import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBusinessImpact } from "@/lib/marketing/businessImpact";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });
  try {
    return Response.json({ businessImpact: await getBusinessImpact(userId) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load business impact" }, { status: 500 });
  }
}
