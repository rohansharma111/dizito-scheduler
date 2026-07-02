import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updatePostStatus } from "@/lib/post-status";
import { createEvent } from "@/lib/events";

const MAX_MANUAL_RETRIES = 3;

const RETRYABLE_STATUSES = [
  "retry_scheduled",
  "permanent_failed",
  "failure_handler_crashed",
];

export async function POST(request: Request) {
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

  const body = await request.json();

  if (!body.targetId) {
    return Response.json(
      {
        error: "Target id required",
      },
      {
        status: 400,
      },
    );
  }

  /*
      Load target
    */
  const targetResult = await pool.query(
    `
      SELECT
        pt.*,
        p.user_id
      FROM post_targets pt
      JOIN posts p
        ON p.id = pt.post_id
      WHERE
        pt.id = $1
      `,
    [body.targetId],
  );

  const target = targetResult.rows[0];

  if (!target) {
    return Response.json(
      {
        error: "Target not found",
      },
      {
        status: 404,
      },
    );
  }

  /*
      Ownership
    */
  if (target.user_id !== (session.user as any).id) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 403,
      },
    );
  }

  /*
      Status check
    */
  if (!RETRYABLE_STATUSES.includes(target.status)) {
    return Response.json(
      {
        error: `Cannot retry target with status "${target.status}"`,
      },
      {
        status: 400,
      },
    );
  }

  /*
      Manual retry limit
    */
  if (target.manual_retry_count >= MAX_MANUAL_RETRIES) {
    return Response.json(
      {
        error: "Maximum manual retries reached",
      },
      {
        status: 400,
      },
    );
  }

  /*
      Reset automatic retry budget
    */
  await pool.query(
    `
    UPDATE post_targets
    SET
      status = 'scheduled',
      retry_count = 0,
      manual_retry_count =
        manual_retry_count + 1,
      next_retry_at = NULL,
      publish_message = NULL,
      processing_started_at = NULL,
      publish_lock_uuid = NULL,
      published_at = NULL
    WHERE id = $1
    `,
    [body.targetId],
  );

  /*
      Recompute parent post
    */
  await updatePostStatus(target.post_id);

  /*
      Event
    */
  await createEvent(
    "TARGET_MANUAL_RETRY",
    "post_target",
    target.id,
    target.user_id,
    {
      platform: target.platform,
      postId: target.post_id,
      automaticRetriesReset: true,
      manualRetryNumber: target.manual_retry_count + 1,
      remainingManualRetries:
        MAX_MANUAL_RETRIES - target.manual_retry_count - 1,
    },
  );

  return Response.json({
    success: true,

    status: "scheduled",

    automaticRetries: {
      used: 0,
      total: 5,
    },

    manualRetries: {
      used: target.manual_retry_count + 1,

      remaining: MAX_MANUAL_RETRIES - target.manual_retry_count - 1,

      total: MAX_MANUAL_RETRIES,
    },

    message: "Manual retry scheduled successfully",
  });
}
