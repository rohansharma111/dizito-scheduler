import { pool } from "@/lib/db";
import { getWeeklyPlan } from "@/lib/marketing/weeklyPlans";

export type ApprovedWeeklyStrategy = {
  strategySummary: string;
  experiment?: {
    hypothesis: string;
    change: string;
    metric: string;
    disposition: "refine" | "retest" | "avoid" | "measure";
  } | null;
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
      body?: string;
      cta: string;
      mediaId?: number | null;
      plannedFor?: string | null;
      evidence?: { sourceType: "content_item" | "variant"; sourceId: number; actionType: string; count: number; value: number; platform: string | null } | null;
      supportingExperimentIds?: number[];
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

    const existing = await client.query(
      `SELECT id, status FROM marketing_weekly_plans WHERE user_id=$1 AND week_start=$2 FOR UPDATE`,
      [userId, weekStart],
    );
    if (existing.rows[0]?.status === "approved") {
      throw new Error("Weekly plan is already approved");
    }

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

    let approvedCampaignId: number | null = null;
    let approvedContentItemId: number | null = null;

    for (let i = 0; i < strategy.campaigns.length; i++) {
      const campaign = strategy.campaigns[i];
      const offerId = campaign.offerId ?? null;
      if (offerId) {
        const offer = await client.query(
          `SELECT id FROM marketing_offers WHERE id=$1 AND user_id=$2`,
          [offerId, userId],
        );
        if (offer.rowCount !== 1) throw new Error("Invalid offer reference");
      }

      const productIds = [...new Set((campaign.productIds ?? []).map(Number))];
      if (productIds.length) {
        const products = await client.query(
          `SELECT id FROM products WHERE id=ANY($1) AND user_id=$2`,
          [productIds, userId],
        );
        if (products.rowCount !== productIds.length) throw new Error("Invalid product reference");
      }

      const campaignResult = await client.query(
        `INSERT INTO marketing_campaigns
         (user_id, offer_id, name, objective, audience, cta, channel_strategy, status, starts_at, ends_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8,$9)
         RETURNING id`,
        [
          userId,
          offerId,
          campaign.name,
          campaign.objective,
          campaign.audience,
          campaign.cta,
          campaign.channelStrategy ?? {},
          weekStart,
          weekEnd,
        ],
      );
      const campaignId = Number(campaignResult.rows[0].id);
      if (approvedCampaignId === null) approvedCampaignId = campaignId;

      for (const productId of productIds) {
        await client.query(
          `INSERT INTO marketing_campaign_products (campaign_id, product_id) VALUES ($1,$2)`,
          [campaignId, productId],
        );
      }
      await client.query(
        `INSERT INTO marketing_weekly_plan_campaigns (weekly_plan_id, campaign_id, position) VALUES ($1,$2,$3)`,
        [plan.id, campaignId, i],
      );

      for (const item of campaign.contentItems ?? []) {
        const mediaId = item.mediaId ?? null;
        if (mediaId !== null) {
          const media = await client.query(
            `SELECT id FROM media_library WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
            [mediaId, userId],
          );
          if (media.rowCount !== 1) throw new Error("Invalid media reference");
        }

        const contentResult = await client.query(
          `INSERT INTO marketing_content_items
           (user_id, campaign_id, content_type, format, topic, angle, hook, body, cta, channel_strategy, media_id, status, planned_for)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'planned',$12)
           RETURNING id`,
          [
            userId,
            campaignId,
            item.contentType,
            item.format,
            item.topic,
            item.angle ?? null,
            item.hook ?? null,
            item.body ?? null,
            item.cta,
            campaign.channelStrategy ?? {},
            mediaId,
            item.plannedFor ?? null,
          ],
        );
        const contentItemId = Number(contentResult.rows[0].id);
        if (approvedContentItemId === null) approvedContentItemId = contentItemId;
        for (const productId of productIds) {
          await client.query(
            `INSERT INTO marketing_content_item_products (content_item_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [contentItemId, productId],
          );
        }
      }
    }

    if (strategy.experiment?.hypothesis && strategy.experiment.change && strategy.experiment.metric) {
      const campaignId = approvedCampaignId;
      const contentItemId = approvedContentItemId;
      if (campaignId === null) throw new Error("Unable to scope weekly experiment to approved campaign");
      if (contentItemId === null) throw new Error("Unable to scope weekly experiment to approved content item");

      const supportingExperimentIds = [...new Set(strategy.campaigns.flatMap((campaign) => (campaign.contentItems ?? []).flatMap((item) => item.supportingExperimentIds ?? []).map(Number).filter(Number.isFinite)))];
      if (supportingExperimentIds.length) {
        const supportingExperiments = await client.query(
          `SELECT id FROM marketing_experiments WHERE id=ANY($1::bigint[]) AND user_id=$2 AND status='completed'`,
          [supportingExperimentIds, userId],
        );
        if (supportingExperiments.rowCount !== supportingExperimentIds.length) throw new Error("Invalid supporting experiment reference");
      }

      const experimentProvenance = { scope: "approved_weekly_content_item", campaignId, contentItemId, weekStart, weekEnd, disposition: strategy.experiment.disposition, supportingExperimentIds };

      await client.query(
        `INSERT INTO marketing_experiments
         (user_id, campaign_id, content_item_id, variant_id, target_type, target_field, target_metadata, name, hypothesis, change_description, metric, status, starts_at, ends_at, baseline_starts_at, baseline_ends_at)
         VALUES ($1,$2,$3,NULL,'content_item',NULL,$4,$5,$6,$7,$8,'planned',$9,$10,
                 $9::timestamptz - ($10::timestamptz - $9::timestamptz),
                 $9::timestamptz - interval '1 microsecond')`,
        [
          userId,
          campaignId,
          contentItemId,
          experimentProvenance,
          "Weekly experiment " + weekStart,
          strategy.experiment.hypothesis,
          strategy.experiment.change,
          strategy.experiment.metric,
          weekStart,
          weekEnd,
        ],
      );
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
