import { pool } from "../db";
import { recordTargetAttempt } from "../attempts";
import { updatePostStatus } from "../post-status";
import { createEvent } from "../events";
import { getRetryDelay } from "../retry";
import { isPermanentError } from "../retry-classifier";
import { logger } from "../logger";

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
  userId,
  error,
}: HandleTargetFailureParams) {
  const resolvedUserId = userId ?? post?.user_id ?? null;

  /*
    Normalize error
  */
  const errorMessage = error instanceof Error ? error.message : String(error);

  /*
    Load current retry state
  */
  const retryResult = await pool.query(
    `
      SELECT
        retry_count,
        manual_retry_count
      FROM post_targets
      WHERE id = $1
      `,
    [target.id],
  );

  const currentRetry = retryResult.rows[0]?.retry_count || 0;

  const manualRetryCount = retryResult.rows[0]?.manual_retry_count || 0;

  const nextRetry = currentRetry + 1;

  /*
    Determine next status
  */
  let nextStatus: "retry_scheduled" | "permanent_failed";

  const permanentError = isPermanentError(errorMessage);

  if (permanentError) {
    nextStatus = "permanent_failed";
  } else if (nextRetry >= MAX_RETRIES) {
    nextStatus = "permanent_failed";
  } else {
    nextStatus = "retry_scheduled";
  }

  /*
    Calculate retry time
  */
  let retryDelay: number | null = null;

  let retryAt: Date | null = null;

  if (nextStatus === "retry_scheduled") {
    retryDelay = getRetryDelay(nextRetry);

    if (retryDelay !== null) {
      retryAt = new Date(Date.now() + retryDelay * 60 * 1000);
    }
  }

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
        next_retry_at = $4,
        processing_started_at = NULL,
        publish_lock_uuid = NULL
      WHERE
        id = $5
        AND
        publish_lock_uuid = $6
      RETURNING id
      `,
    [
      nextStatus,
      nextRetry,
      errorMessage,
      retryAt,
      target.id,
      target.publish_lock_uuid,
    ],
  );

  /*
    Lost lock
  */
  if (failedUpdate.rowCount === 0) {
    const debug = await pool.query(
      `
        SELECT
          id,
          status,
          publish_lock_uuid
        FROM post_targets
        WHERE id = $1
        `,
      [target.id],
    );

    logger.warn("Publish lock lost", {
      targetId: target.id,

      expectedLock: target.publish_lock_uuid,

      actual: debug.rows[0],
    });

    return {
      status: "lock_lost",
    };
  }

  /*
    Save attempt
  */
  await recordTargetAttempt(target.id, nextStatus, errorMessage);

  /*
    Recompute post status
  */
  await updatePostStatus(target.post_id);

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
    Generic failure event
  */
  await createEvent("TARGET_FAILED", "post_target", target.id, resolvedUserId, {
    platform: target.platform,

    accountId: target.social_account_id,

    accountName: account?.account_name,

    retry: nextRetry,

    manualRetry: manualRetryCount,

    maxRetries: MAX_RETRIES,

    error: errorMessage,
  });

  /*
    Permanent failure
  */
  if (nextStatus === "permanent_failed") {
    await createEvent(
      "TARGET_PERMANENT_FAILED",
      "post_target",
      target.id,
      resolvedUserId,
      {
        platform: target.platform,

        accountId: target.social_account_id,

        retries: nextRetry,

        manualRetries: manualRetryCount,

        permanentError,

        error: errorMessage,
      },
    );

    logger.error(`Target ${target.id} permanently failed`);
  }

  /*
    Retry scheduled
  */
  if (nextStatus === "retry_scheduled") {
    await createEvent(
      "TARGET_RETRY_SCHEDULED",
      "post_target",
      target.id,
      resolvedUserId,
      {
        platform: target.platform,

        accountId: target.social_account_id,

        retry: nextRetry,

        manualRetry: manualRetryCount,

        retryDelay,

        retryAt,
      },
    );

    logger.info(
      `Target ${target.id} retry scheduled (${nextRetry}/${MAX_RETRIES})`,
    );
  }

  return {
    status: nextStatus,
    retry: nextRetry,
    manualRetry: manualRetryCount,
    retryAt,
  };
}
