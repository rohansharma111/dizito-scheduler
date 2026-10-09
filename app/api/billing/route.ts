import { getServerSession } from "next-auth";
import { getBillingUserId } from "@/lib/billing/session";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { BillingRepository } from "@/lib/billing/repository";
import { getEffectiveBillingContext, getEntitlement, getMonthlyUsage } from "@/lib/billing/entitlements";
import { BILLING_ENTITLEMENT_KEYS, LEGACY_PLAN_TO_V1 } from "@/lib/billing/catalog";
import {
  BILLING_SCHEMA_FALLBACK_ENTITLEMENTS,
  BILLING_SCHEMA_FALLBACK_PLANS,
} from "@/lib/billing/schema-compatibility";

async function getLegacyCompatibleBillingResponse(userId: number) {
  const [userResult, subscriptionResult, socialResult, commerceResult, legacyUsageResult] =
    await Promise.all([
      pool.query("SELECT plan FROM users WHERE id = $1 LIMIT 1", [userId]),
      pool.query(
        `SELECT provider, provider_subscription_id, provider_customer_id, status,
                trial_start_at, trial_end_at, current_period_start, current_period_end,
                cancel_at_period_end, grace_period_until
         FROM subscriptions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [userId],
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM social_accounts WHERE user_id = $1", [userId]),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM commerce_channels WHERE user_id = $1 AND status = 'active'",
        [userId],
      ),
      pool.query(
        `SELECT posts_created, posts_published, bulk_upload_rows, ai_images_generated
         FROM user_usage WHERE user_id = $1 AND year = $2 AND month = $3`,
        [userId, new Date().getFullYear(), new Date().getMonth() + 1],
      ),
    ]);

  const legacyPlan = String(userResult.rows[0]?.plan ?? "free");
  const planCode = LEGACY_PLAN_TO_V1[legacyPlan] ?? "free";
  const plan = BILLING_SCHEMA_FALLBACK_PLANS[planCode];
  const entitlements = BILLING_SCHEMA_FALLBACK_ENTITLEMENTS[planCode];
  const subscription = subscriptionResult.rows[0] ?? null;
  const socialChannels = Number(socialResult.rows[0]?.count ?? 0);
  const commerceChannels = Number(commerceResult.rows[0]?.count ?? 0);
  const legacyUsage = legacyUsageResult.rows[0] ?? {};
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
      priceMinor: plan.price_minor,
      currency: plan.currency,
      interval: plan.interval,
      trialDays: plan.trial_days,
    },
    subscription: {
      provider: subscription?.provider ?? null,
      id: subscription?.provider_subscription_id ?? null,
      customerId: subscription?.provider_customer_id ?? null,
      status: subscription?.status ?? null,
      subscriptionPlan: plan.code,
      renewalDate: subscription?.current_period_end ?? null,
      trialDaysLeft,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      gracePeriodUntil: subscription?.grace_period_until ?? null,
    },
    usage: {
      socialChannels,
      socialChannelsLimit: Number(entitlements[BILLING_ENTITLEMENT_KEYS.socialChannels]),
      commerceChannels,
      commerceChannelsLimit: Number(entitlements[BILLING_ENTITLEMENT_KEYS.commerceChannels]),
      publishing: Number(legacyUsage.posts_published ?? 0),
      publishingLimit: Number(entitlements[BILLING_ENTITLEMENT_KEYS.publishingMonthly]),
      aiActions: Number(legacyUsage.ai_images_generated ?? 0),
      aiActionsLimit: Number(entitlements[BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]),
      legacyPostsCreated: Number(legacyUsage.posts_created ?? 0),
      legacyPostsPublished: Number(legacyUsage.posts_published ?? 0),
      legacyAIImages: Number(legacyUsage.ai_images_generated ?? 0),
      bulkUploads: Number(legacyUsage.bulk_upload_rows ?? 0),
    },
    features: {
      businessBrain: entitlements[BILLING_ENTITLEMENT_KEYS.businessBrain],
      strategist: entitlements[BILLING_ENTITLEMENT_KEYS.strategist],
      creator: entitlements[BILLING_ENTITLEMENT_KEYS.creator],
      generateMyWeek: entitlements[BILLING_ENTITLEMENT_KEYS.generateMyWeek],
      optimizer: entitlements[BILLING_ENTITLEMENT_KEYS.optimizer],
      commerce: entitlements[BILLING_ENTITLEMENT_KEYS.commerce],
    },
    billingHistory: [],
    pricingHypothesis: true,
    billingSchemaReady: false,
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const userId = getBillingUserId(session);
    const schemaCheck = await pool.query(
      `SELECT
         current_database() AS database_name,
         current_schema() AS current_schema,
         current_setting('search_path') AS search_path,
         to_regclass('billing_plans') IS NOT NULL AS has_billing_plans,
         to_regclass('billing_plan_entitlement_values') IS NOT NULL AS has_entitlement_values,
         to_regclass('billing_entitlement_definitions') IS NOT NULL AS has_entitlement_definitions,
         to_regclass('billing_usage_counters') IS NOT NULL AS has_usage_counters,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = ANY(current_schemas(false))
             AND table_name = 'subscriptions'
             AND column_name = 'billing_plan_id'
         ) AS has_subscription_billing_plan_id`,
    );
    const schema = schemaCheck.rows[0];
    const billingSchemaReady = Boolean(
      schema?.has_billing_plans &&
      schema?.has_entitlement_values &&
      schema?.has_entitlement_definitions &&
      schema?.has_usage_counters &&
      schema?.has_subscription_billing_plan_id
    );

    if (!billingSchemaReady) {
      console.warn(
        "[billing] Canonical billing schema is missing from the connected database; serving legacy-compatible billing data.",
        {
          database: schema?.database_name,
          currentSchema: schema?.current_schema,
          searchPath: schema?.search_path,
          hasBillingPlans: schema?.has_billing_plans,
          hasEntitlementValues: schema?.has_entitlement_values,
          hasEntitlementDefinitions: schema?.has_entitlement_definitions,
          hasUsageCounters: schema?.has_usage_counters,
          hasSubscriptionBillingPlanId: schema?.has_subscription_billing_plan_id,
        },
      );
      return getLegacyCompatibleBillingResponse(userId);
    }

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
