import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { BillingRepository } from "@/lib/billing/repository";
import { getEffectiveBillingContext, getEntitlement, getMonthlyUsage } from "@/lib/billing/entitlements";
import { BILLING_ENTITLEMENT_KEYS } from "@/lib/billing/catalog";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const userId = Number((session.user as any).id);
    const context = await getEffectiveBillingContext(userId);
    const plan = await BillingRepository.getPlanByCode(context.planCode);
    if (!plan) return Response.json({ error: "Billing plan not configured" }, { status: 500 });

    const [subscriptionResult, socialResult, commerceResult, legacyUsageResult, historyResult] =
      await Promise.all([
        pool.query(
          `SELECT provider, provider_subscription_id, provider_customer_id, status,
                  trial_start_at, trial_end_at, current_period_start, current_period_end,
                  cancel_at_period_end, grace_period_until
           FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
          [userId],
        ),
        pool.query("SELECT COUNT(*)::int AS count FROM social_accounts WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*)::int AS count FROM commerce_channels WHERE user_id = $1 AND status = 'active'", [userId]),
        pool.query(
          `SELECT posts_created, posts_published, bulk_upload_rows, ai_images_generated
           FROM user_usage WHERE user_id = $1 AND year = $2 AND month = $3`,
          [userId, new Date().getFullYear(), new Date().getMonth() + 1],
        ),
        pool.query(
          `SELECT event, amount, created_at FROM billing_events
           WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
          [userId],
        ),
      ]);

    const subscription = subscriptionResult.rows[0] ?? null;
    const socialChannels = Number(socialResult.rows[0]?.count ?? 0);
    const commerceChannels = Number(commerceResult.rows[0]?.count ?? 0);
    const legacyUsage = legacyUsageResult.rows[0] ?? {};

    const [socialLimit, commerceLimit, publishingLimit, aiLimit] = await Promise.all([
      getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.socialChannels),
      getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.commerceChannels),
      getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.publishingMonthly),
      getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.aiActionsMonthly),
    ]);

    const trialEnd = subscription?.trial_end_at ? new Date(subscription.trial_end_at) : null;
    const trialDaysLeft = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
      : 0;

    return Response.json({
      plan: plan.code,
      planDetails: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMinor: Number(plan.price_minor),
        currency: plan.currency,
        interval: plan.interval,
        trialDays: plan.trial_days,
      },
      subscription: {
        provider: subscription?.provider ?? null,
        id: subscription?.provider_subscription_id ?? null,
        customerId: subscription?.provider_customer_id ?? null,
        status: context.status ?? subscription?.status ?? null,
        subscriptionPlan: plan.code,
        renewalDate: subscription?.current_period_end ?? null,
        trialDaysLeft,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
        gracePeriodUntil: subscription?.grace_period_until ?? null,
      },
      usage: {
        socialChannels,
        socialChannelsLimit: Number(socialLimit ?? 0),
        commerceChannels,
        commerceChannelsLimit: Number(commerceLimit ?? 0),
        publishing: await getMonthlyUsage(userId, BILLING_ENTITLEMENT_KEYS.publishingMonthly),
        publishingLimit: Number(publishingLimit ?? 0),
        aiActions: await getMonthlyUsage(userId, BILLING_ENTITLEMENT_KEYS.aiActionsMonthly),
        aiActionsLimit: Number(aiLimit ?? 0),
        legacyPostsCreated: Number(legacyUsage.posts_created ?? 0),
        legacyPostsPublished: Number(legacyUsage.posts_published ?? 0),
        legacyAIImages: Number(legacyUsage.ai_images_generated ?? 0),
        bulkUploads: Number(legacyUsage.bulk_upload_rows ?? 0),
      },
      features: {
        businessBrain: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.businessBrain),
        strategist: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.strategist),
        creator: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.creator),
        generateMyWeek: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.generateMyWeek),
        optimizer: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.optimizer),
        commerce: await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.commerce),
      },
      billingHistory: historyResult.rows,
      pricingHypothesis: true,
    });
  } catch (error) {
    console.error("Billing API Error:", error);
    return Response.json({ error: "Failed to load billing" }, { status: 500 });
  }
}
