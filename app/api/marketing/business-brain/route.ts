import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBusinessBrain } from "@/lib/marketing/businessBrain";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = Number((session.user as { id?: string | number }).id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: "Invalid user" }, { status: 401 });
    }

    const businessBrain = await getBusinessBrain(userId);
    return Response.json({ businessBrain });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load business brain" }, { status: 500 });
  }
}
