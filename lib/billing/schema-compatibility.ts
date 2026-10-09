import {
  BILLING_ENTITLEMENT_KEYS,
  BillingEntitlementKey,
  BillingPlanCode,
} from "./catalog";

export type BillingPlanFallback = {
  id: null;
  code: BillingPlanCode;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  interval: string;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
};

export const BILLING_SCHEMA_FALLBACK_PLANS: Record<BillingPlanCode, BillingPlanFallback> = {
  free: {
    id: null,
    code: "free",
    name: "Free",
    description: "Free V1 entry plan",
    price_minor: 0,
    currency: "INR",
    interval: "month",
    trial_days: 0,
    is_active: true,
    is_public: true,
  },
  growth: {
    id: null,
    code: "growth",
    name: "Growth",
    description: "For growing businesses",
    price_minor: 79900,
    currency: "INR",
    interval: "month",
    trial_days: 7,
    is_active: true,
    is_public: true,
  },
  pro: {
    id: null,
    code: "pro",
    name: "Pro",
    description: "For businesses running a serious growth engine",
    price_minor: 199900,
    currency: "INR",
    interval: "month",
    trial_days: 7,
    is_active: true,
    is_public: true,
  },
  agency: {
    id: null,
    code: "agency",
    name: "Agency",
    description: "Future multi-business / agency plan",
    price_minor: 499900,
    currency: "INR",
    interval: "month",
    trial_days: 14,
    is_active: false,
    is_public: false,
  },
  founding_beta: {
    id: null,
    code: "founding_beta",
    name: "Founding Beta",
    description: "Private beta offer",
    price_minor: 49900,
    currency: "INR",
    interval: "month",
    trial_days: 7,
    is_active: true,
    is_public: false,
  },
};

type FallbackEntitlements = Record<BillingEntitlementKey, boolean | number>;

export const BILLING_SCHEMA_FALLBACK_ENTITLEMENTS: Record<BillingPlanCode, FallbackEntitlements> = {
  free: {
    [BILLING_ENTITLEMENT_KEYS.socialChannels]: 3,
    [BILLING_ENTITLEMENT_KEYS.commerceChannels]: 0,
    [BILLING_ENTITLEMENT_KEYS.publishingMonthly]: 50,
    [BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]: 25,
    [BILLING_ENTITLEMENT_KEYS.businessBrain]: true,
    [BILLING_ENTITLEMENT_KEYS.strategist]: false,
    [BILLING_ENTITLEMENT_KEYS.creator]: true,
    [BILLING_ENTITLEMENT_KEYS.generateMyWeek]: false,
    [BILLING_ENTITLEMENT_KEYS.optimizer]: false,
    [BILLING_ENTITLEMENT_KEYS.commerce]: false,
  },
  growth: {
    [BILLING_ENTITLEMENT_KEYS.socialChannels]: 10,
    [BILLING_ENTITLEMENT_KEYS.commerceChannels]: 2,
    [BILLING_ENTITLEMENT_KEYS.publishingMonthly]: 500,
    [BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]: 250,
    [BILLING_ENTITLEMENT_KEYS.businessBrain]: true,
    [BILLING_ENTITLEMENT_KEYS.strategist]: true,
    [BILLING_ENTITLEMENT_KEYS.creator]: true,
    [BILLING_ENTITLEMENT_KEYS.generateMyWeek]: true,
    [BILLING_ENTITLEMENT_KEYS.optimizer]: false,
    [BILLING_ENTITLEMENT_KEYS.commerce]: true,
  },
  pro: {
    [BILLING_ENTITLEMENT_KEYS.socialChannels]: 25,
    [BILLING_ENTITLEMENT_KEYS.commerceChannels]: 5,
    [BILLING_ENTITLEMENT_KEYS.publishingMonthly]: 2000,
    [BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]: 1000,
    [BILLING_ENTITLEMENT_KEYS.businessBrain]: true,
    [BILLING_ENTITLEMENT_KEYS.strategist]: true,
    [BILLING_ENTITLEMENT_KEYS.creator]: true,
    [BILLING_ENTITLEMENT_KEYS.generateMyWeek]: true,
    [BILLING_ENTITLEMENT_KEYS.optimizer]: true,
    [BILLING_ENTITLEMENT_KEYS.commerce]: true,
  },
  agency: {
    [BILLING_ENTITLEMENT_KEYS.socialChannels]: 100,
    [BILLING_ENTITLEMENT_KEYS.commerceChannels]: 25,
    [BILLING_ENTITLEMENT_KEYS.publishingMonthly]: 10000,
    [BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]: 5000,
    [BILLING_ENTITLEMENT_KEYS.businessBrain]: true,
    [BILLING_ENTITLEMENT_KEYS.strategist]: true,
    [BILLING_ENTITLEMENT_KEYS.creator]: true,
    [BILLING_ENTITLEMENT_KEYS.generateMyWeek]: true,
    [BILLING_ENTITLEMENT_KEYS.optimizer]: true,
    [BILLING_ENTITLEMENT_KEYS.commerce]: true,
  },
  founding_beta: {
    [BILLING_ENTITLEMENT_KEYS.socialChannels]: 10,
    [BILLING_ENTITLEMENT_KEYS.commerceChannels]: 2,
    [BILLING_ENTITLEMENT_KEYS.publishingMonthly]: 500,
    [BILLING_ENTITLEMENT_KEYS.aiActionsMonthly]: 250,
    [BILLING_ENTITLEMENT_KEYS.businessBrain]: true,
    [BILLING_ENTITLEMENT_KEYS.strategist]: true,
    [BILLING_ENTITLEMENT_KEYS.creator]: true,
    [BILLING_ENTITLEMENT_KEYS.generateMyWeek]: true,
    [BILLING_ENTITLEMENT_KEYS.optimizer]: false,
    [BILLING_ENTITLEMENT_KEYS.commerce]: true,
  },
};

export function isMissingBillingRelation(error: unknown): boolean {
  const pgError = error as { code?: unknown; message?: unknown } | null;
  if (pgError?.code !== "42P01") return false;

  const message = String(pgError.message ?? "");
  return [
    "billing_plans",
    "billing_plan_entitlement_values",
    "billing_entitlement_definitions",
    "billing_usage_counters",
  ].some((relation) => message.includes(`"${relation}"`));
}
