import { pool } from "../../../../../lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { createEvent } from "../../../../../lib/events";

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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          pt.*,
          p.user_id,
          p.id AS post_id
        FROM post_targets pt

        INNER JOIN posts p
          ON p.id = pt.post_id

        WHERE
          pt.id = $1
        `,
      [id],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

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
      await client.query("ROLLBACK");

      return Response.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    if (!["failed", "permanent_failed"].includes(target.status)) {
      await client.query("ROLLBACK");

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
      Determine next attempt
    */

    const attemptResult = await client.query(
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
      Preserve retry history
    */

    await client.query(
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
      [
        target.id,
        nextAttempt,
        "retry",
        `Retry requested for ${target.platform}`,
      ],
    );

    /*
      Reset target
    */

    await client.query(
      `
      UPDATE post_targets
      SET
        status = 'scheduled',
        retry_count = 0,
        next_retry_at = NULL,
        publish_message = NULL,
        processing_started_at = NULL,
        publish_lock_uuid = NULL
      WHERE
        id = $1
      `,
      [target.id],
    );

    /*
      Trigger post recomputation
    */

    await client.query(
      `
      UPDATE posts
      SET
        updated_at = NOW()
      WHERE
        id = $1
      `,
      [target.post_id],
    );

    /*
      Legacy publish log
    */

    await client.query(
      `
      INSERT INTO
      publish_logs
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

    /*
      System Event
    */

    await createEvent(
      "RETRY_TRIGGERED",
      "post_target",
      target.id,
      target.user_id,
      {
        platform: target.platform,
        postId: target.post_id,
        retryAttempt: nextAttempt,
      },
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      retryAttempt: nextAttempt,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    return Response.json(
      {
        error: "Retry failed",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
