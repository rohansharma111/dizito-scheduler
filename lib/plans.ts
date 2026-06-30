export type PlanName = "free" | "creator" | "agency";

export interface Plan {
  name: string;

  price: number;

  accounts: number;

  monthlyPosts: number;

  bulkUpload: boolean;

  retrySystem: boolean;

  calendar: boolean;

  drafts: boolean;

  analytics: boolean;

  prioritySupport: boolean;

  linkedinPublishing: boolean;

  facebookPublishing: boolean;

  instagramPublishing: boolean;
}

export const plans: Record<PlanName, Plan> = {
  free: {
    name: "Free",

    price: 0,

    accounts: 1,

    monthlyPosts: 20,

    bulkUpload: false,

    retrySystem: false,

    calendar: true,

    drafts: true,

    analytics: false,

    prioritySupport: false,

    linkedinPublishing: true,

    facebookPublishing: true,

    instagramPublishing: true,
  },

  creator: {
    name: "Creator",

    price: 299,

    accounts: 5,

    monthlyPosts: 500,

    bulkUpload: true,

    retrySystem: true,

    calendar: true,

    drafts: true,

    analytics: true,

    prioritySupport: false,

    linkedinPublishing: true,

    facebookPublishing: true,

    instagramPublishing: true,
  },

  agency: {
    name: "Agency",

    price: 999,

    accounts: 25,

    monthlyPosts: Number.MAX_SAFE_INTEGER,

    bulkUpload: true,

    retrySystem: true,

    calendar: true,

    drafts: true,

    analytics: true,

    prioritySupport: true,

    linkedinPublishing: true,

    facebookPublishing: true,

    instagramPublishing: true,
  },
};

export function getPlan(plan?: string): Plan {
  if (!plan || !(plan in plans)) {
    return plans.free;
  }

  return plans[plan as PlanName];
}

export function canCreatePost(plan: string, currentPosts: number) {
  const p = getPlan(plan);

  return currentPosts < p.monthlyPosts;
}

export function canConnectAccount(plan: string, currentAccounts: number) {
  const p = getPlan(plan);

  return currentAccounts < p.accounts;
}

export function hasFeature(
  plan: string,
  feature:
    | "bulkUpload"
    | "retrySystem"
    | "calendar"
    | "drafts"
    | "analytics"
    | "prioritySupport",
) {
  const p = getPlan(plan);

  return Boolean(p[feature]);
}
