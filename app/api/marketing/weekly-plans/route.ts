import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWeeklyPlan, listWeeklyPlans } from "@/lib/marketing/weeklyPlans";
import { pool } from "@/lib/db";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const weekStart = new URL(request.url).searchParams.get("weekStart");
  if (weekStart) {
    if (!validDate(weekStart)) return jsonError("Invalid weekStart");
    return Response.json({ weeklyPlan: await getWeeklyPlan(userId, weekStart) });
  }
  return Response.json({ weeklyPlans: await listWeeklyPlans(userId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const body = await request.json();
  if (!validDate(body.weekStart) || !validDate(body.weekEnd)) return jsonError("Invalid week dates");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO marketing_weekly_plans
       (user_id, week_start, week_end, status, strategy_summary, plan_payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET week_end=EXCLUDED.week_end, strategy_summary=EXCLUDED.strategy_summary,
                     plan_payload=EXCLUDED.plan_payload, updated_at=now()
       RETURNING *`,
      [userId, body.weekStart, body.weekEnd, body.status ?? "draft", body.strategySummary ?? null, body.planPayload ?? {}],
    );
    const plan = result.rows[0];

    if (body.campaignIds !== undefined) {
      const rawCampaignIds: unknown[] = Array.isArray(body.campaignIds) ? body.campaignIds : [];
      const campaignIds: number[] = [...new Set(rawCampaignIds.map((value) => Number(value)))];
      if (campaignIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
        await client.query("ROLLBACK");
        return jsonError("Invalid campaignIds");
      }
      if (campaignIds.length) {
        const campaigns = await client.query(
          `SELECT id FROM marketing_campaigns WHERE id = ANY($1) AND user_id = $2`,
          [campaignIds, userId],
        );
        if (campaigns.rowCount !== campaignIds.length) {
          await client.query("ROLLBACK");
          return jsonError("Invalid campaign selection");
        }
      }
      await client.query(`DELETE FROM marketing_weekly_plan_campaigns WHERE weekly_plan_id = $1`, [plan.id]);
      for (let position = 0; position < campaignIds.length; position++) {
        await client.query(
          `INSERT INTO marketing_weekly_plan_campaigns (weekly_plan_id, campaign_id, position) VALUES ($1,$2,$3)`,
          [plan.id, campaignIds[position], position],
        );
      }
    }
    await client.query("COMMIT");
    return Response.json({ weeklyPlan: await getWeeklyPlan(userId, body.weekStart) });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return jsonError("Failed to save weekly plan", 500);
  } finally {
    client.release();
  }
}
