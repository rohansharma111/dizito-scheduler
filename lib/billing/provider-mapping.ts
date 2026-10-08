import { pool } from "@/lib/db";
import { BillingPlanCode } from "./catalog";

export async function getProviderPlanMapping(planCode: BillingPlanCode, provider: string) {
  const result = await pool.query(
    `SELECT bpm.provider_plan_id, bpm.plan_id
     FROM billing_provider_mappings bpm
     JOIN billing_plans bp ON bp.id = bpm.plan_id
     WHERE bp.code = $1 AND bpm.provider = $2 AND bpm.is_active = true
     LIMIT 1`,
    [planCode, provider],
  );
  return result.rows[0] as { provider_plan_id: string; plan_id: number } | undefined;
}

export async function getBillingPlanByProviderPlanId(provider: string, providerPlanId: string) {
  const result = await pool.query(
    `SELECT bp.id, bp.code
     FROM billing_provider_mappings bpm
     JOIN billing_plans bp ON bp.id = bpm.plan_id
     WHERE bpm.provider = $1 AND bpm.provider_plan_id = $2 AND bpm.is_active = true
     LIMIT 1`,
    [provider, providerPlanId],
  );
  return result.rows[0] as { id: number; code: BillingPlanCode } | undefined;
}
