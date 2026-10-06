import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { persistApprovedWeek } from "@/lib/marketing/approveWeek";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as any).id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isValidDateOnly = (value: unknown) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!isValidDateOnly(body.weekStart) || !isValidDateOnly(body.weekEnd) || body.weekStart > body.weekEnd) {
    return Response.json({ error: "Invalid week dates" }, { status: 400 });
  }
  if (!body.strategy || typeof body.strategy.strategySummary !== "string" || !Array.isArray(body.strategy.campaigns)) {
    return Response.json({ error: "Invalid strategy" }, { status: 400 });
  }
  if (body.strategy.campaigns.length === 0) {
    return Response.json({ error: "At least one campaign is required" }, { status: 400 });
  }
  for (const campaign of body.strategy.campaigns) {
    if (!campaign || typeof campaign !== "object" || typeof campaign.name !== "string" || typeof campaign.objective !== "string" || typeof campaign.audience !== "string" || typeof campaign.cta !== "string") {
      return Response.json({ error: "Invalid campaign" }, { status: 400 });
    }
    if (campaign.channelStrategy != null && (typeof campaign.channelStrategy !== "object" || Array.isArray(campaign.channelStrategy))) {
      return Response.json({ error: "Invalid campaign channel strategy" }, { status: 400 });
    }
    if (campaign.productIds != null && (!Array.isArray(campaign.productIds) || campaign.productIds.some((id: unknown) => !Number.isInteger(Number(id)) || Number(id) <= 0))) {
      return Response.json({ error: "Invalid campaign product references" }, { status: 400 });
    }
    if (campaign.contentItems != null && !Array.isArray(campaign.contentItems)) {
      return Response.json({ error: "Invalid campaign content items" }, { status: 400 });
    }
    for (const item of campaign.contentItems ?? []) {
      if (!item || typeof item !== "object" || typeof item.contentType !== "string" || typeof item.format !== "string" || typeof item.topic !== "string" || typeof item.cta !== "string") {
        return Response.json({ error: "Invalid content item" }, { status: 400 });
      }
      if (item.mediaId != null && (!Number.isInteger(Number(item.mediaId)) || Number(item.mediaId) <= 0)) {
        return Response.json({ error: "Invalid content media reference" }, { status: 400 });
      }
      if (item.plannedFor != null && (typeof item.plannedFor !== "string" || Number.isNaN(new Date(item.plannedFor).getTime()))) {
        return Response.json({ error: "Invalid content planned time" }, { status: 400 });
      }
      if (item.supportingExperimentIds != null && (!Array.isArray(item.supportingExperimentIds) || item.supportingExperimentIds.some((id: unknown) => !Number.isInteger(Number(id)) || Number(id) <= 0))) {
        return Response.json({ error: "Invalid supporting experiment references" }, { status: 400 });
      }
    }
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
      userId,
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
    if (error instanceof Error && [
      "Invalid user",
      "Invalid week range",
      "Invalid strategy",
      "Invalid offer reference",
      "Invalid product reference",
      "Invalid media reference",
      "Invalid supporting experiment reference",
      "Unable to scope weekly experiment to approved campaign",
      "Unable to scope weekly experiment to approved content item",
    ].includes(error.message)) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Failed to approve weekly plan" }, { status: 500 });
  }
}
