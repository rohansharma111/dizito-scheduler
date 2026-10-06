import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { persistApprovedWeek } from "@/lib/marketing/approveWeek";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekEnd)) {
    return Response.json({ error: "Invalid week dates" }, { status: 400 });
  }
  if (!body.strategy || typeof body.strategy.strategySummary !== "string" || !Array.isArray(body.strategy.campaigns)) {
    return Response.json({ error: "Invalid strategy" }, { status: 400 });
  }
  if (body.strategy.experiment != null) {
    const experiment = body.strategy.experiment;
    const validDispositions = new Set(["refine", "retest", "avoid", "measure"]);
    if (typeof experiment !== "object" || typeof experiment.hypothesis !== "string" || typeof experiment.change !== "string" || typeof experiment.metric !== "string" || !validDispositions.has(experiment.disposition) || typeof experiment.selectionReason !== "string") {
      return Response.json({ error: "Invalid experiment" }, { status: 400 });
    }
  }

  try {
    const weeklyPlan = await persistApprovedWeek(
      Number((session.user as any).id),
      body.weekStart,
      body.weekEnd,
      body.strategy,
    );
    return Response.json({ weeklyPlan });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "Weekly plan is already approved") {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "Failed to approve weekly plan" }, { status: 500 });
  }
}
