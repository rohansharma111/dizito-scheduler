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

  metadata: any;

  created_at: Date;

  updated_at: Date;
};

function db(client?: PoolClient) {
  return client ?? pool;
}

export async function createSubscription(
  data: {
    userId: number;

    provider: BillingProvider;

    providerSubscriptionId: string;

    providerCustomerId?: string | null;

    plan: BillingPlan;

    status: SubscriptionStatus;

    trialStartAt?: Date | null;

    trialEndAt?: Date | null;

    currentPeriodStart?: Date | null;

    currentPeriodEnd?: Date | null;

    metadata?: any;
  },
  client?: PoolClient,
) {
  const result = await db(client).query(
    `
    INSERT INTO subscriptions
    (
      user_id,
      provider,
      provider_subscription_id,
      provider_customer_id,
      plan,
      status,
      trial_start_at,
      trial_end_at,
      current_period_start,
      current_period_end,
      metadata
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
    )
    RETURNING *
    `,
    [
      data.userId,
      data.provider,
      data.providerSubscriptionId,
      data.providerCustomerId ?? null,
      data.plan,
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
    `
    SELECT *
    FROM subscriptions
    WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function getSubscriptionByProviderId(
  providerSubscriptionId: string,
  client?: PoolClient,
) {
  const result = await db(client).query(
    `
    SELECT *
    FROM subscriptions
    WHERE provider_subscription_id = $1
    `,
    [providerSubscriptionId],
  );

  return result.rows[0] as SubscriptionRecord | undefined;
}

export async function getActiveSubscriptionForUser(
  userId: number,
  client?: PoolClient,
) {
  const result = await db(client).query(
    `
    SELECT *
    FROM subscriptions
    WHERE
      user_id = $1
      AND status IN
      (
        'created',
        'authenticated',
        'active'
      )
    ORDER BY id DESC
    LIMIT 1
    `,
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

    metadata?: any;
  },
  client?: PoolClient,
) {
  const result = await db(client).query(
    `
    UPDATE subscriptions
    SET
      status = COALESCE($2,status),

      provider_customer_id =
        COALESCE($3,provider_customer_id),

      trial_start_at =
        COALESCE($4,trial_start_at),

      trial_end_at =
        COALESCE($5,trial_end_at),

      current_period_start =
        COALESCE($6,current_period_start),

      current_period_end =
        COALESCE($7,current_period_end),

      cancel_at_period_end =
        COALESCE($8,cancel_at_period_end),

      cancelled_at =
        COALESCE($9,cancelled_at),

      ended_at =
        COALESCE($10,ended_at),

      metadata =
        COALESCE($11,metadata),

      payment_failed_at =
        COALESCE($12,payment_failed_at),

      grace_period_until =
        COALESCE($13,grace_period_until),

      updated_at = NOW()

    WHERE
      provider_subscription_id = $1

    RETURNING *
    `,
    [
      providerSubscriptionId,

      updates.status,

      updates.providerCustomerId,

      updates.trialStartAt,

      updates.trialEndAt,

      updates.currentPeriodStart,

      updates.currentPeriodEnd,

      updates.cancelAtPeriodEnd,

      updates.cancelledAt,

      updates.endedAt,

      updates.metadata,

      updates.paymentFailedAt,

      updates.gracePeriodUntil,
    ],
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
    },
    client,
  );
}

export async function deleteSubscription(id: number, client?: PoolClient) {
  await db(client).query(
    `
    DELETE
    FROM subscriptions
    WHERE id = $1
    `,
    [id],
  );
}

export const BillingRepository = {
  createSubscription,

  getSubscriptionById,

  getSubscriptionByProviderId,

  getActiveSubscriptionForUser,

  updateSubscription,

  cancelSubscription,

  deleteSubscription,
};
