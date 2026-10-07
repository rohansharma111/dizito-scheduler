import { pool } from "@/lib/db";
import { LEGACY_PLAN_TO_V1, BillingEntitlementKey, BillingPlanCode } from "./catalog";

export type EntitlementValue = boolean | number | Record<string, unknown> | null;

export type EffectiveBillingContext = {
  planCode: BillingPlanCode;
  planId: number | null;
  subscriptionId: number | null;
  status: string | null;
  gracePeriodUntil: Date | null;
};

export async function getEffectiveBillingContext(userId: number): Promise<EffectiveBillingContext> {
  const result = await pool.query(
    `
      SELECT
        s.id AS subscription_id,
        s.billing_plan_id,
        s.status,
        s.grace_period_until,
        bp.code AS plan_code
      FROM subscriptions s
      LEFT JOIN billing_plans bp ON bp.id = s.billing_plan_id
      WHERE s.user_id = $1
        AND (
          s.status IN ('created','authenticated','active','pending','paused','payment_failed','grace_period')
          OR (s.status IN ('payment_failed','grace_period') AND s.grace_period_until > NOW())
        )
      ORDER BY
        CASE WHEN s.status IN ('active','authenticated','created') THEN 0 ELSE 1 END,
        s.id DESC
      LIMIT 1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return {
      planCode: "free",
      planId: null,
      subscriptionId: null,
      status: null,
      gracePeriodUntil: null,
    };
  }

  const fallback = LEGACY_PLAN_TO_V1[String(row.plan_code ?? "free")] ?? "free";
  const grace = row.grace_period_until ? new Date(row.grace_period_until) : null;

  if (
    (row.status === "payment_failed" || row.status === "grace_period") &&
    grace &&
    grace.getTime() <= Date.now()
  ) {
    return {
      planCode: "free",
      planId: null,
      subscriptionId: Number(row.subscription_id),
      status: row.status,
      gracePeriodUntil: grace,
    };
  }

  return {
    planCode: fallback,
    planId: row.billing_plan_id ? Number(row.billing_plan_id) : null,
    subscriptionId: Number(row.subscription_id),
    status: row.status,
    gracePeriodUntil: grace,
  };
}

export async function getEntitlement(
  userId: number,
  key: BillingEntitlementKey,
): Promise<EntitlementValue> {
  const context = await getEffectiveBillingContext(userId);

  const result = await pool.query(
    `
      SELECT bpe.value
      FROM billing_plan_entitlements bpe
      JOIN billing_entitlements be ON be.id = bpe.entitlement_id
      JOIN billing_plans bp ON bp.id = bpe.plan_id
      WHERE bp.code = $1 AND be.key = $2
      LIMIT 1
    `,
    [context.planCode, key],
  );

  if (!result.rows[0]) return null;
  return result.rows[0].value as EntitlementValue;
}

export async function hasEntitlement(
  userId: number,
  key: BillingEntitlementKey,
): Promise<boolean> {
  const value = await getEntitlement(userId, key);
  return value === true || (typeof value === "number" && value > 0);
}

export async function requireEntitlement(
  userId: number,
  key: BillingEntitlementKey,
): Promise<void> {
  if (!(await hasEntitlement(userId, key))) {
    throw new Error(`Upgrade required: ${key}`);
  }
}

function monthBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getMonthlyUsage(
  userId: number,
  key: BillingEntitlementKey,
): Promise<number> {
  const { start } = monthBounds();
  const result = await pool.query(
    `
      SELECT used
      FROM billing_usage_counters
      WHERE user_id = $1 AND period_start = $2 AND entitlement_key = $3
    `,
    [userId, start, key],
  );
  return Number(result.rows[0]?.used ?? 0);
}

export async function consumeMonthlyUsage(
  userId: number,
  key: BillingEntitlementKey,
  amount = 1,
): Promise<{ used: number; limit: number }> {
  if (amount <= 0) throw new Error("Usage amount must be positive");

  const limitValue = await getEntitlement(userId, key);
  const limit = typeof limitValue === "number" ? limitValue : Number(limitValue ?? 0);
  if (!Number.isFinite(limit)) throw new Error(`Invalid entitlement: ${key}`);

  const { start, end } = monthBounds();
  const result = await pool.query(
    `
      INSERT INTO billing_usage_counters
        (user_id, period_start, period_end, entitlement_key, used)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, period_start, entitlement_key)
      DO UPDATE SET
        used = billing_usage_counters.used + EXCLUDED.used,
        updated_at = NOW()
      WHERE billing_usage_counters.used + EXCLUDED.used <= $6
      RETURNING used
    `,
    [userId, start, end, key, amount, limit],
  );

  if (!result.rows[0]) {
    throw new Error(`Usage limit reached: ${key}`);
  }

  return { used: Number(result.rows[0].used), limit };
}

export function legacyPlanToV1(plan: string | null | undefined): BillingPlanCode {
  return LEGACY_PLAN_TO_V1[plan ?? "free"] ?? "free";
}
