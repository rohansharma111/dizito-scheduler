import { pool } from "@/lib/db";
import { PoolClient } from "pg";

function db(client?: PoolClient) {
  return client ?? pool;
}

export async function updateUserPlan(
  userId: number,
  plan: string,
  client?: PoolClient,
) {
  const result = await db(client).query(
    `
    UPDATE users
    SET
      plan = $1
    WHERE
      id = $2
      AND plan <> $1
    RETURNING id
    `,
    [plan, userId],
  );

  return result.rowCount === 1;
}
