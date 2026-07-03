import { pool } from "@/lib/db";

export async function getCurrentUsage(userId: number) {
  const now = new Date();

  const year = now.getFullYear();

  const month = now.getMonth() + 1;

  let result = await pool.query(
    `
      SELECT *
      FROM user_usage
      WHERE
        user_id=$1
        AND year=$2
        AND month=$3
      `,
    [userId, year, month],
  );

  if (result.rows.length === 0) {
    result = await pool.query(
      `
        INSERT INTO user_usage
        (
          user_id,
          year,
          month
        )
        VALUES
        (
          $1,
          $2,
          $3
        )
        RETURNING *
        `,
      [userId, year, month],
    );
  }

  return result.rows[0];
}
