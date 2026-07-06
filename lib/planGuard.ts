import { getPlan } from "./plans";

export function requireFeature(
  userPlan: string,
  feature: keyof ReturnType<typeof getPlan>,
) {
  const plan = getPlan(userPlan);

  if (!plan[feature]) {
    throw new Error("Upgrade required");
  }
}