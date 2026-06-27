import { pool } from "../db";
import { recordTargetAttempt } from "../attempts";
import { updatePostStatus } from "../post-status";
import { createEvent } from "../events";
import { getRetryDelay } from "../retry";

const MAX_RETRIES = 5;

interface HandleTargetFailureParams {
  target: any;
  post: any;
  account: any;
  userId: number | null;
  error: unknown;
}

export async function handleTargetFailure({
  target,
  post,
  account,
  error,
}: HandleTargetFailureParams) {
  const userId = post?.user_id;

  /*
    Normalize error
  */
  const errorMessage = error instanceof Error ? error.message : String(error);

  /*
    Get current retry count
  */
  const retryResult = await pool.query(
    `
      SELECT retry_count
      FROM post_targets
      WHERE id = $1
      `,
    [target.id],
  );

  const currentRetry = retryResult.rows[0]?.retry_count || 0;

  const nextRetry = currentRetry + 1;

  const retryDelay = getRetryDelay(nextRetry);

  const nextStatus =
    nextRetry >= MAX_RETRIES ? "permanent_failed" : "retry_scheduled";

  /*
    Update target
  */
  const failedUpdate = await pool.query(
    `
      UPDATE post_targets
      SET
        status = $1,

        retry_count = $2,

        publish_message = $3,

        next_retry_at =
          CASE
            WHEN $4 IS NULL
            THEN NULL
            ELSE
              NOW() +
              ($4 || ' minutes')
                ::interval
          END,

        processing_started_at =
          NULL,

        publish_lock_uuid =
          NULL

      WHERE
        id = $5
        AND
        publish_lock_uuid =
          $6

      RETURNING id
      `,
    [
      nextStatus,
      nextRetry,
      errorMessage,
      nextStatus === "retry_scheduled" ? retryDelay : null,
      target.id,
      target.publish_lock_uuid,
    ],
  );

  if (failedUpdate.rowCount === 0) {
    throw new Error("Publish lock lost");
  }

  /*
    Save attempt
  */
  await recordTargetAttempt(target.id, nextStatus, errorMessage);

  /*
    Update post
  */
  await updatePostStatus(target.post_id);

  /*
    Generic failure event
  */
  await createEvent("TARGET_FAILED", "post_target", target.id, userId, {
    platform: target.platform,

    accountId: target.social_account_id,

    accountName: account?.account_name,

    retry: nextRetry,

    maxRetries: MAX_RETRIES,

    error: errorMessage,
  });

  /*
    Publish log
  */
  await pool.query(
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
    [target.post_id, nextStatus, errorMessage],
  );

  /*
    Permanent fail
  */
  if (nextStatus === "permanent_failed") {
    await createEvent(
      "TARGET_PERMANENT_FAILED",
      "post_target",
      target.id,
      userId,
      {
        platform: target.platform,

        accountId: target.social_account_id,

        retries: nextRetry,

        error: errorMessage,
      },
    );

    console.error(
      `Target ${target.id} permanently failed after ${MAX_RETRIES} attempts`,
    );
  } else {
    /*
    Retry scheduled
  */
    await createEvent(
      "TARGET_RETRY_SCHEDULED",
      "post_target",
      target.id,
      userId,
      {
        platform: target.platform,

        accountId: target.social_account_id,

        retry: nextRetry,

        retryDelay,

        retryAt: new Date(Date.now() + retryDelay * 60000),
      },
    );

    console.log(`Target ${target.id} failed (${nextRetry}/${MAX_RETRIES})`);
  }
  return {
    status: nextStatus,
  };
}
