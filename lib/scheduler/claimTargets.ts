import { pool } from "../db";
export async function claimTargets() {
  const result = await pool.query(`
            UPDATE post_targets
            SET
              status = 'processing',
              processing_started_at = NOW(),
              publish_lock_uuid=gen_random_uuid()
            WHERE id IN (
              SELECT pt.id
              FROM post_targets pt
              JOIN posts p
                ON p.id = pt.post_id
              WHERE
                (
  pt.status='scheduled'
  OR
  (
    pt.status='retry_scheduled'
    AND
    pt.next_retry_at <= NOW()
  )
)
                AND p.schedule_time <= NOW()
              ORDER BY
                p.schedule_time,
                pt.id
              LIMIT 20
              FOR UPDATE SKIP LOCKED
            )
            RETURNING *
          `);
  return result.rows;
}
