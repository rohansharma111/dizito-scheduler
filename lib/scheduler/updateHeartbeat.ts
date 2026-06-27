import { pool } from "../db";

export async function updateHeartbeat(metrics: {
  claimed: number;
  published: number;
  failed: number;
  permanentFailed: number;
  retried: number;
}) {
  await pool.query(
    `
    UPDATE scheduler_heartbeat
    SET
      last_run = NOW(),
      processed = $1,
      failures = $2
    WHERE id = 1
    `,
    [metrics.claimed, metrics.failed],
  );
}
