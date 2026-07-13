import { pool } from "@/lib/db";
import { PoolClient } from "pg";

function db(client?: PoolClient) {
  return client ?? pool;
}

export async function createEvent(
  event: string,
  entityType: string,
  entityId: number,
  userId: number | undefined,
  payload: any,
  client?: PoolClient,
) {
  return db(client).query(
    `
    INSERT INTO system_events
    (
      event,
      entity_type,
      entity_id,
      user_id,
      payload
    )
    VALUES
    (
      $1,$2,$3,$4,$5
    )
    `,
    [event, entityType, entityId, userId ?? null, payload ?? {}],
  );
}
