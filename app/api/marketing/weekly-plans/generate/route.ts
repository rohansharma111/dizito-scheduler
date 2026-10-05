import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWeeklyPlan } from "@/lib/marketing/generateWeeklyPlan";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const userId = Number((session.user as { id?: string | number }).id);
  if (!Number.isInteger(userId) || userId <= 0) return jsonError("Invalid user", 401);

  const body = await request.json();
  if (!validDate(body.weekStart)) return jsonError("Invalid weekStart");

  try {
    const generatedWeek = await generateWeeklyPlan(userId, body.weekStart);
    return Response.json({ generatedWeek });
  } catch (error) {
    console.error(error);
    return jsonError("Failed to generate weekly plan", 500);
  }
}
