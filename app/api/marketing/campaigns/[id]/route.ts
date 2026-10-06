import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { getCampaign } from "@/lib/marketing/campaigns";

const STATUSES = ["draft", "planned", "active", "paused", "completed", "archived"];
const TRANSITIONS: Record<string, string[]> = { draft: ["planned", "archived"], planned: ["active", "paused", "archived"], active: ["paused", "completed", "archived"], paused: ["active", "completed", "archived"], completed: ["archived"], archived: [] };

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) return errorResponse("Invalid campaign id");

  const campaign = await getCampaign(Number((session.user as any).id), campaignId);
  if (!campaign) return errorResponse("Campaign not found", 404);
  return Response.json({ campaign });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) return errorResponse("Invalid campaign id");

  const userId = Number((session.user as any).id);
  const body = await request.json();
  const existing = await getCampaign(userId, campaignId);
  if (!existing) return errorResponse("Campaign not found", 404);

  if (body.status !== undefined) {\n    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) return errorResponse("Invalid campaign status");\n    if (body.status !== existing.status && !TRANSITIONS[existing.status]?.includes(body.status)) return errorResponse("Invalid status transition from " + existing.status + " to " + body.status);\n  }
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 200)) return errorResponse("Invalid campaign name");
  for (const field of ["objective", "audience", "cta"]) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") return errorResponse("Invalid " + field);
  }
  if (body.channelStrategy !== undefined && (typeof body.channelStrategy !== "object" || body.channelStrategy === null || Array.isArray(body.channelStrategy))) return errorResponse("Invalid channelStrategy");

  const goalId = body.goalId === undefined ? existing.goalId : body.goalId === null || body.goalId === "" ? null : Number(body.goalId);
  const offerId = body.offerId === undefined ? existing.offerId : body.offerId === null || body.offerId === "" ? null : Number(body.offerId);
  const productIds = body.productIds === undefined ? existing.productIds : Array.isArray(body.productIds) ? [...new Set(body.productIds.map(Number))] : null;
  if (goalId !== null && (!Number.isInteger(goalId) || goalId <= 0)) return errorResponse("Invalid goalId");
  if (offerId !== null && (!Number.isInteger(offerId) || offerId <= 0)) return errorResponse("Invalid offerId");
  if (!productIds) return errorResponse("Invalid productIds");
  if (productIds.some((value: number) => !Number.isInteger(value) || value <= 0)) return errorResponse("Invalid productIds");

  const startsAt = body.startsAt === undefined ? existing.startsAt : body.startsAt;
  const endsAt = body.endsAt === undefined ? existing.endsAt : body.endsAt;
  if (startsAt !== null && startsAt !== undefined && Number.isNaN(new Date(startsAt).getTime())) return errorResponse("Invalid startsAt");
  if (endsAt !== null && endsAt !== undefined && Number.isNaN(new Date(endsAt).getTime())) return errorResponse("Invalid endsAt");
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) return errorResponse("endsAt must be on or after startsAt");

  const brain = await getBusinessBrain(userId);
  if (goalId !== null && !brain.goals.some((goal) => goal.id === goalId)) return errorResponse("Invalid goal");
  if (offerId !== null && !brain.offers.some((offer) => offer.id === offerId)) return errorResponse("Invalid offer");
  if (productIds.some((productId: number) => !brain.products.some((product) => product.id === productId))) return errorResponse("Invalid product selection");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      \`UPDATE marketing_campaigns
       SET name=$1, goal_id=$2, offer_id=$3, objective=$4, audience=$5, cta=$6,
           channel_strategy=$7::jsonb, status=$8, starts_at=$9, ends_at=$10, updated_at=now()
       WHERE id=$11 AND user_id=$12\`,
      [
        body.name === undefined ? existing.name : body.name.trim(),
        goalId, offerId,
        body.objective === undefined ? existing.objective : body.objective,
        body.audience === undefined ? existing.audience : body.audience,
        body.cta === undefined ? existing.cta : body.cta,
        JSON.stringify(body.channelStrategy === undefined ? existing.channelStrategy : body.channelStrategy),
        body.status === undefined ? existing.status : body.status,
        startsAt ?? null, endsAt ?? null, campaignId, userId,
      ],
    );
    if (body.productIds !== undefined) {
      await client.query(\`DELETE FROM marketing_campaign_products WHERE campaign_id=$1\`, [campaignId]);
      for (const productId of productIds) {
        await client.query(\`INSERT INTO marketing_campaign_products (campaign_id, product_id) VALUES ($1,$2)\`, [campaignId, productId]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return errorResponse("Failed to update campaign", 500);
  } finally {
    client.release();
  }

  return Response.json({ campaign: await getCampaign(userId, campaignId) });
}
