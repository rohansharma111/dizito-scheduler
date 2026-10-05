import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWeeklyStrategy } from "@/lib/marketing/strategy";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const strategy = await generateWeeklyStrategy(Number((session.user as any).id));
    return Response.json({ strategy });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to generate weekly strategy" }, { status: 500 });
  }
}
