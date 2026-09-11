import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getBusinessBrain } from "@/lib/marketing/businessBrain";
import { listCampaigns } from "@/lib/marketing/campaigns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return Response.json({ campaigns: await listCampaigns(Number((session.user as any).id)) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "Campaign name is required" }, { status: 400 });

  const goalId = body.goalId == null ? null : Number(body.goalId);
  const offerId = body.offerId == null ? null : Number(body.offerId);
  const productIds = Array.isArray(body.productIds) ? [...new Set(body.productIds.map(Number).filter(Number.isInteger))] : [];
  const channelStrategy = body.channelStrategy && typeof body.channelStrategy === "object" && !Array.isArray(body.channelStrategy) ? body.channelStrategy : {};

  try {
    const brain = await getBusinessBrain(userId);
    if (goalId !== null && !brain.goals.some((goal) => goal.id === goalId)) {
      return Response.json({ error: "Invalid goal" }, { status: 400 });
    }
    if (offerId !== null && !brain.offers.some((offer) => offer.id === offerId)) {
      return Response.json({ error: "Invalid offer" }, { status: 400 });
    }
    if (productIds.some((id) => !brain.products.some((product) => product.id === id))) {
      return Response.json({ error: "Invalid product selection" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const campaign = await client.query(
        `INSERT INTO marketing_campaigns
          (user_id, goal_id, offer_id, name, objective, audience, cta, channel_strategy, status, starts_at, ends_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
         RETURNING id`,
        [userId, goalId, offerId, name, body.objective ?? null, body.audience ?? null, body.cta ?? null, JSON.stringify(channelStrategy), body.status ?? "draft", body.startsAt ?? null, body.endsAt ?? null],
      );

      for (const productId of productIds) {
        await client.query(`INSERT INTO marketing_campaign_products (campaign_id, product_id) VALUES ($1,$2)`, [campaign.rows[0].id, productId]);
      }
      await client.query("COMMIT");

      return Response.json({ campaignId: Number(campaign.rows[0].id) }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
