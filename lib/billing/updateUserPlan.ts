import { pool } from "@/lib/db";
import { PoolClient } from "pg";

function db(client?: PoolClient) {
  return client ?? pool;
}

function legacyMirror(plan: string) {
  if (plan === "free") return "free";
  if (plan === "agency") return "agency";
  return "creator";
}

export async function updateUserPlan(
  userId: number,
  plan: string,
  client?: PoolClient,
) {
  const legacyPlan = legacyMirror(plan);
  const result = await db(client).query(
    `UPDATE users
     SET plan = $1
     WHERE id = $2 AND plan <> $1
     RETURNING id`,
    [legacyPlan, userId],
  );
  return result.rowCount === 1;
}
