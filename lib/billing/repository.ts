import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { BillingPlan, BillingProvider, SubscriptionStatus } from "./types";

export type SubscriptionRecord = {
  id: number;
  user_id: number;
  provider: BillingProvider;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  plan: BillingPlan;
  billing_plan_id: number | null;
  pending_billing_plan_id: number | null;
  plan_change_at: Date | null;
  status: SubscriptionStatus;
  trial_start_at: Date | null;
  trial_end_at: Date | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  cancelled_at: Date | null;
  ended_at: Date | null;
  payment_failed_at: Date | null;
  grace_period_until: Date | null;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

function db(client?: PoolClient) {
  return client ?? pool;
}

export async function getPlanByCode(code: BillingPlan) {
  const result = await pool.query(
    `SELECT id, code, name, description, price_minor, currency, billing_interval AS interval, trial_days, is_active, is_public
     FROM billing_plans WHERE code = $1 LIMIT 1`,
    [code],
  );
  return result.rows[0] as
    | {
        id: number;
        code: BillingPlan;
        name: string;
        description: string | null;
        price_minor: number;
        currency: string;
        interval: string;
        trial_days: number;
        is_active: boolean;
        is_public: boolean;
      }
    | undefined;
}

export async function listPublicPlans() {
  const result = await pool.query(
    `SELECT id, code, name, description, price_minor, currency, billing_interval AS interval, trial_days
     FROM billing_plans
     WHERE is_active = true AND is_public = true
     ORDER BY sort_order, id`,
  );
  return result.rows;
}

export async function createSubscription(
  data: {
    userId: number;
    provider: BillingProvider;
    providerSubscriptionId: string;
    providerCustomerId?: string | null;
    plan: BillingPlan;
    billingPlanId: number;
    status: SubscriptionStatus;
    trialStartAt?: Date | null;
    trialEndAt?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    metadata?: unknown;
  },
  client?: PoolClient,
) {
  const result = await db(client).query(
    `INSERT INTO subscriptions
      (user_id, provider, provider_subscription_id, provider_customer_id, plan,
       billing_plan_id, status, trial_start_at, trial_end_at, current_period_start,
       current_period_end, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.userId,
      data.provider,
      data.providerSubscriptionId,
      data.providerCustomerId ?? null,
      data.plan,
      data.billingPlanId,
      data.status,
      data.trialStartAt ?? null,
      data.trialEndAt ?? null,
      data.currentPeriodStart ?? null,
      data.currentPeriodEnd ?? null,
      data.metadata ?? {},
    ],
  );
  return result.rows[0] as SubscriptionRecord;
}

export async function getSubscriptionById(id: number, client?: PoolClient) {
  const result = await db(client).query(
    `SELECT * FROM subscriptions WHERE id = $1`,
    [id],
  );
  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function getSubscriptionByProviderId(
  providerSubscriptionId: string,
  client?: PoolClient,
) {
  const result = await db(client).query(
    `SELECT * FROM subscriptions WHERE provider_subscription_id = $1`,
    [providerSubscriptionId],
  );
  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function getActiveSubscriptionForUser(
  userId: number,
  client?: PoolClient,
) {
  const result = await db(client).query(
    `SELECT * FROM subscriptions
     WHERE user_id = $1
       AND (
         status IN ('created','authenticated','active','pending','paused')
         OR (
           status IN ('payment_failed','grace_period')
           AND grace_period_until > NOW()
         )
       )
     ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function updateSubscription(
  providerSubscriptionId: string,
  updates: {
    status?: SubscriptionStatus;
    providerCustomerId?: string | null;
    trialStartAt?: Date | null;
    trialEndAt?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    cancelledAt?: Date | null;
    endedAt?: Date | null;
    paymentFailedAt?: Date | null;
    gracePeriodUntil?: Date | null;
    billingPlanId?: number | null;
    pendingBillingPlanId?: number | null;
    planChangeAt?: Date | null;
    plan?: BillingPlan;
    metadata?: unknown;
  },
  client?: PoolClient,
) {
  const fields: Array<[string, unknown]> = [
    ["status", updates.status],
    ["provider_customer_id", updates.providerCustomerId],
    ["trial_start_at", updates.trialStartAt],
    ["trial_end_at", updates.trialEndAt],
    ["current_period_start", updates.currentPeriodStart],
    ["current_period_end", updates.currentPeriodEnd],
    ["cancel_at_period_end", updates.cancelAtPeriodEnd],
    ["cancelled_at", updates.cancelledAt],
    ["ended_at", updates.endedAt],
    ["metadata", updates.metadata],
    ["payment_failed_at", updates.paymentFailedAt],
    ["grace_period_until", updates.gracePeriodUntil],
    ["billing_plan_id", updates.billingPlanId],
    ["pending_billing_plan_id", updates.pendingBillingPlanId],
    ["plan_change_at", updates.planChangeAt],
    ["plan", updates.plan],
  ].filter((field): field is [string, unknown] => field[1] !== undefined);

  const values: unknown[] = [];
  const setClauses = fields.map(([column, value]) => {
    values.push(value);
    return `${column} = $${values.length}`;
  });

  values.push(providerSubscriptionId);
  const providerIdParam = values.length;

  const result = await db(client).query(
    `UPDATE subscriptions
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE provider_subscription_id = $${providerIdParam}
     RETURNING *`,
    values,
  );

  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function cancelSubscription(
  providerSubscriptionId: string,
  cancelledAt: Date = new Date(),
  client?: PoolClient,
) {
  return updateSubscription(
    providerSubscriptionId,
    {
      status: "cancelled",
      cancelledAt,
      endedAt: cancelledAt,
      cancelAtPeriodEnd: false,
      pendingBillingPlanId: null,
      planChangeAt: cancelledAt,
    },
    client,
  );
}

export async function deleteSubscription(id: number, client?: PoolClient) {
  await db(client).query(`DELETE FROM subscriptions WHERE id = $1`, [id]);
}

export const BillingRepository = {
  getPlanByCode,
  listPublicPlans,
  createSubscription,
  getSubscriptionById,
  getSubscriptionByProviderId,
  getActiveSubscriptionForUser,
  updateSubscription,
  cancelSubscription,
  deleteSubscription,
};
