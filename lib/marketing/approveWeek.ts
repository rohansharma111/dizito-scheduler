import { pool } from "@/lib/db";
import { getWeeklyPlan } from "@/lib/marketing/weeklyPlans";

export type ApprovedWeeklyStrategy = {
  strategySummary: string;
  campaigns: Array<{
    name: string;
    objective: string;
    audience: string;
    offerId?: number | null;
    productIds?: number[];
    cta: string;
    channelStrategy?: Record<string, unknown>;
    contentItems?: Array<{
      contentType: string;
      format: string;
      topic: string;
      angle?: string;
      hook?: string;
      cta: string;
      plannedFor?: string | null;
    }>;
  }>;
};

export async function persistApprovedWeek(
  userId: number,
  weekStart: string,
  weekEnd: string,
  strategy: ApprovedWeeklyStrategy,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const planResult = await client.query(
      `INSERT INTO marketing_weekly_plans
       (user_id, week_start, week_end, status, strategy_summary, plan_payload)
       VALUES ($1,$2,$3,'approved',$4,$5)
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET week_end=EXCLUDED.week_end, status='approved', strategy_summary=EXCLUDED.strategy_summary,
                     plan_payload=EXCLUDED.plan_payload, updated_at=now()
       RETURNING *`,
      [userId, weekStart, weekEnd, strategy.strategySummary, strategy],
    );
    const plan = planResult.rows[0];

    for (let i = 0; i < strategy.campaigns.length; i++) {
      const campaign = strategy.campaigns[i];
      const offerId = campaign.offerId ?? null;
      const offer = offerId
        ? await client.query(`SELECT id FROM marketing_offers WHERE id=$1 AND user_id=$2`, [offerId, userId])
        : { rowCount: 0 } as any;
      if (offerId && offer.rowCount !== 1) throw new Error("Invalid offer reference");

      const productIds = [...new Set((campaign.productIds ?? []).map(Number))];
      if (productIds.length) {
        const products = await client.query(`SELECT id FROM products WHERE id=ANY($1) AND user_id=$2`, [productIds, userId]);
        if (products.rowCount !== productIds.length) throw new Error("Invalid product reference");
      }

      const campaignResult = await client.query(
        `INSERT INTO marketing_campaigns
         (user_id, offer_id, name, objective, audience, cta, channel_strategy, status, starts_at, ends_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8,$9)
         RETURNING id`,
        [userId, offerId, campaign.name, campaign.objective, campaign.audience, campaign.cta,
         campaign.channelStrategy ?? {}, weekStart, weekEnd],
      );
      const campaignId = campaignResult.rows[0].id;

      for (const productId of productIds) {
        await client.query(`INSERT INTO marketing_campaign_products (campaign_id, product_id) VALUES ($1,$2)`, [campaignId, productId]);
      }
      await client.query(
        `INSERT INTO marketing_weekly_plan_campaigns (weekly_plan_id, campaign_id, position) VALUES ($1,$2,$3)`,
        [plan.id, campaignId, i],
      );

      for (const item of campaign.contentItems ?? []) {
        const contentResult = await client.query(
          `INSERT INTO marketing_content_items
           (user_id, campaign_id, content_type, format, topic, angle, hook, body, cta, channel_strategy, status, planned_for)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,'planned',$10)
           RETURNING id`,
          [userId, campaignId, item.contentType, item.format, item.topic, item.angle ?? null,
           item.hook ?? null, item.cta, campaign.channelStrategy ?? {}, item.plannedFor ?? null],
        );
        const contentItemId = contentResult.rows[0].id;
        for (const productId of productIds) {
          await client.query(
            `INSERT INTO marketing_content_item_products (content_item_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [contentItemId, productId],
          );
        }
      }
    }

    await client.query("COMMIT");
    return getWeeklyPlan(userId, weekStart);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
