export type BillingPlanCode =
  | "free"
  | "growth"
  | "pro"
  | "agency"
  | "founding_beta";

export const BILLING_PLAN_CODES: BillingPlanCode[] = [
  "free",
  "growth",
  "pro",
  "agency",
  "founding_beta",
];

export const PUBLIC_BILLING_PLAN_CODES: BillingPlanCode[] = [
  "free",
  "growth",
  "pro",
];

export const LEGACY_PLAN_TO_V1: Record<string, BillingPlanCode> = {
  free: "free",
  creator: "growth",
  growth: "growth",
  pro: "pro",
  agency: "agency",
  founding_beta: "founding_beta",
};

export const BILLING_ENTITLEMENT_KEYS = {
  socialChannels: "channels.social.max",
  commerceChannels: "channels.commerce.max",
  publishingMonthly: "publishing.monthly.max",
  aiActionsMonthly: "ai.actions.monthly.max",
  businessBrain: "feature.business_brain",
  strategist: "feature.strategist",
  creator: "feature.creator",
  generateMyWeek: "feature.generate_my_week",
  optimizer: "feature.optimizer",
  commerce: "feature.commerce",
} as const;

export type BillingEntitlementKey =
  (typeof BILLING_ENTITLEMENT_KEYS)[keyof typeof BILLING_ENTITLEMENT_KEYS];
