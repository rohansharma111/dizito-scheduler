import { pool } from "@/lib/db";

export async function getWeeklyPlan(userId: number, weekStart: string) {
  const result = await pool.query(
    `SELECT
       wp.*,
       COALESCE(
         json_agg(
           json_build_object(
             'campaignId', wpc.campaign_id,
             'position', wpc.position
           ) ORDER BY wpc.position, wpc.campaign_id
         ) FILTER (WHERE wpc.campaign_id IS NOT NULL),
         '[]'
       ) AS campaigns
     FROM marketing_weekly_plans wp
     LEFT JOIN marketing_weekly_plan_campaigns wpc ON wpc.weekly_plan_id = wp.id
     WHERE wp.user_id = $1 AND wp.week_start = $2
     GROUP BY wp.id`,
    [userId, weekStart],
  );
  return result.rows[0] ?? null;
}

export async function listWeeklyPlans(userId: number) {
  const result = await pool.query(
    `SELECT id, week_start, week_end, status, strategy_summary, created_at, updated_at
     FROM marketing_weekly_plans
     WHERE user_id = $1
     ORDER BY week_start DESC`,
    [userId],
  );
  return result.rows;
}
