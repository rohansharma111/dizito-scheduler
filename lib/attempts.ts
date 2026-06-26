import { pool } from "./db";

export async function recordTargetAttempt(
  targetId: number,
  status: "success" | "failed" | "permanent_failed",
  message: string,
) {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM post_target_attempts
    WHERE post_target_id = $1
    `,
    [targetId],
  );

  const attemptNumber = Number(result.rows[0].count) + 1;

  await pool.query(
    `
    INSERT INTO
    post_target_attempts
    (
      post_target_id,
      attempt_number,
      status,
      message
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4
    )
    `,
    [targetId, attemptNumber, status, message],
  );
}
