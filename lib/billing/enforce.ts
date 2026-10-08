import { pool } from "@/lib/db";
import {
  BILLING_ENTITLEMENT_KEYS,
  BillingEntitlementKey,
} from "./catalog";
import {
  consumeMonthlyUsage,
  getEntitlement,
  getMonthlyUsage,
  requireEntitlement,
} from "./entitlements";

export async function requireMonthlyCapacity(
  userId: number,
  key: BillingEntitlementKey,
  amount = 1,
) {
  const value = await getEntitlement(userId, key);
  const limit = typeof value === "number" ? value : Number(value ?? 0);
  const used = await getMonthlyUsage(userId, key);
  if (used + amount > limit) {
    throw new Error(`Usage limit reached: ${key}`);
  }
  return { used, limit };
}

export async function consumePublishing(userId: number, amount = 1) {
  return consumeMonthlyUsage(
    userId,
    BILLING_ENTITLEMENT_KEYS.publishingMonthly,
    amount,
  );
}

export async function consumeAIAction(userId: number, amount = 1) {
  return consumeMonthlyUsage(
    userId,
    BILLING_ENTITLEMENT_KEYS.aiActionsMonthly,
    amount,
  );
}

export async function requireBusinessBrain(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.businessBrain);
}

export async function requireStrategist(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.strategist);
}

export async function requireCreator(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.creator);
}

export async function requireGenerateMyWeek(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.generateMyWeek);
}

export async function requireOptimizer(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.optimizer);
}

export async function requireCommerce(userId: number) {
  return requireEntitlement(userId, BILLING_ENTITLEMENT_KEYS.commerce);
}

export async function requireSocialChannelCapacity(userId: number, additional = 1) {
  const value = await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.socialChannels);
  const limit = typeof value === "number" ? value : Number(value ?? 0);
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM social_accounts WHERE user_id = $1",
    [userId],
  );
  const used = Number(result.rows[0]?.count ?? 0);
  if (used + additional > limit) {
    throw new Error("Social channel limit reached");
  }
  return { used, limit };
}

export async function requireCommerceChannelCapacity(userId: number, additional = 1) {
  await requireCommerce(userId);
  const value = await getEntitlement(userId, BILLING_ENTITLEMENT_KEYS.commerceChannels);
  const limit = typeof value === "number" ? value : Number(value ?? 0);
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM commerce_channels WHERE user_id = $1 AND status = 'active'",
    [userId],
  );
  const used = Number(result.rows[0]?.count ?? 0);
  if (used + additional > limit) {
    throw new Error("Commerce channel limit reached");
  }
  return { used, limit };
}
