import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EXPERIMENT_STATUSES, getMarketingExperiment, getMarketingExperimentOutcomes, updateMarketingExperiment } from "@/lib/marketing/experiments";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  const id = Number((await context.params).id);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    const experiment = await getMarketingExperiment(userId, id);
    if (!experiment) return Response.json({ error: "Experiment not found" }, { status: 404 });
    return Response.json({ experiment, outcomes: await getMarketingExperimentOutcomes(userId, id) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load experiment" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((session.user as any).id);
  const id = Number((await context.params).id);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid request" }, { status: 400 });
  const body = await request.json();
  if (body.status !== undefined && !(EXPERIMENT_STATUSES as readonly string[]).includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (body.resultSummary !== undefined && body.resultSummary !== null && typeof body.resultSummary !== "string") return Response.json({ error: "Invalid result summary" }, { status: 400 });
  try {
    const experiment = await updateMarketingExperiment(userId, id, {
      status: body.status,
      resultSummary: body.resultSummary,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });
    if (!experiment) return Response.json({ error: "Experiment not found" }, { status: 404 });
    return Response.json({ experiment, outcomes: await getMarketingExperimentOutcomes(userId, id) });
  } catch (error) {
    if (error instanceof Error && error.message === "Cancelled experiments cannot be reopened") return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "Completed experiments require observed outcomes or a result summary") return Response.json({ error: error.message }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Failed to update experiment" }, { status: 500 });
  }
}
