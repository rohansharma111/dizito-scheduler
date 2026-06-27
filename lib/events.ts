import { pool } from "./db";

export async function createEvent(
  eventType: string,
  entityType: string,
  entityId: number,
  userId?: number,
  payload?: any,
) {
  await pool.query(
    `
    INSERT INTO system_events
    (
      event_type,
      entity_type,
      entity_id,
      user_id,
      payload
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5
    )
    `,
    [eventType, entityType, entityId, userId || null, payload ?? {}],
  );
}
