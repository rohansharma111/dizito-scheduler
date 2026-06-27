import { pool } from "./../db";
export async function recoverTargets() {

  await pool.query(`
    UPDATE post_targets
    SET
      status='scheduled',
      processing_started_at=NULL,
      publish_lock_uuid=NULL
    WHERE
      status='processing'
      AND
      processing_started_at <
      NOW()-INTERVAL '15 minutes'
  `);

}