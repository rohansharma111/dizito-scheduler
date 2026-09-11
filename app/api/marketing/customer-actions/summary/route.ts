import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomerActionSummary } from "@/lib/marketing/customerActions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) return Response.json({ error: "Invalid user" }, { status: 401 });
  try { return Response.json({ summary: await getCustomerActionSummary(userId) }); }
  catch (error) { console.error(error); return Response.json({ error: "Failed to load customer action summary" }, { status: 500 }); }
}
