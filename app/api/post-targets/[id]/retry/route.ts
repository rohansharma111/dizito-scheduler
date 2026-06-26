import { pool } from "../../../../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { id } = await params;

  const result = await pool.query(
    `
      SELECT
        pt.*,
        p.user_id
      FROM post_targets pt

      INNER JOIN posts p
        ON p.id = pt.post_id

      WHERE pt.id = $1
      `,
    [id],
  );

  if (result.rows.length === 0) {
    return Response.json(
      {
        error: "Target not found",
      },
      {
        status: 404,
      },
    );
  }

  const target = result.rows[0];

  if (target.user_id !== (session.user as any).id) {
    return Response.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    );
  }

  /*
      Allow both:
      failed
      permanent_failed
    */
  if (!["failed", "permanent_failed"].includes(target.status)) {
    return Response.json(
      {
        error: "Only failed targets can be retried",
      },
      {
        status: 400,
      },
    );
  }

  /*
      Get attempt count
    */
  const attemptResult = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM post_target_attempts
      WHERE
        post_target_id = $1
      `,
    [target.id],
  );

  const nextAttempt = Number(attemptResult.rows[0].count) + 1;

  /*
      Save retry history
    */
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
    [target.id, nextAttempt, "retry", `Retry requested for ${target.platform}`],
  );

  /*
      Reset target
    */
  await pool.query(
    `
    UPDATE post_targets
    SET
      status = 'scheduled',
      retry_count = 0,
      publish_message = NULL,
      processing_started_at = NULL
    WHERE id = $1
    `,
    [id],
  );

  /*
      Recompute post status
    */
  await pool.query(
    `
    UPDATE posts
    SET
      updated_at = NOW()
    WHERE id = $1
    `,
    [target.post_id],
  );

  /*
      Legacy publish log
    */
  await pool.query(
    `
    INSERT INTO publish_logs
    (
      post_id,
      status,
      message
    )
    VALUES
    (
      $1,
      $2,
      $3
    )
    `,
    [target.post_id, "retry", `Retry requested for ${target.platform}`],
  );

  return Response.json({
    success: true,
    retryAttempt: nextAttempt,
  });
}
