import { pool } from "../db";
import { updatePostStatus } from "../post-status";
import { recordTargetAttempt } from "../attempts";
import { createEvent } from "../events";

export async function handleTargetSuccess(
  target: any,
  post: any,
  account: any,
) {
  /*
    Verify publish lock
  */
  const successUpdate = await pool.query(
    `
      UPDATE post_targets
      SET
        status = 'published',
        published_at = NOW(),
        processing_started_at = NULL,
        publish_message = NULL,
        publish_lock_uuid = NULL
      WHERE
        id = $1
        AND publish_lock_uuid = $2
      RETURNING id
      `,
    [target.id, target.publish_lock_uuid],
  );

  if (successUpdate.rowCount !== 1) {
    throw new Error("Publish lock lost");
  }

  /*
    Event
  
  await createEvent(
    "TARGET_PUBLISHED",
    "post_target",
    target.id,
    post.user_id,
    {
      platform: target.platform,

      attempts: target.retry_count + 1,

      postId: post.id,

      socialAccountId: target.social_account_id,

      accountName: account.account_name,

      publishedAt: new Date().toISOString(),
    },
  );
*/
  /*
    Attempt history
  */
  await recordTargetAttempt(
    target.id,
    "success",
    `Published to ${target.platform}`,
  );

  /*
    Recompute post status
  */
  await updatePostStatus(target.post_id);

  /*
    Publish log
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
    [target.post_id, "success", `Published to ${target.platform}`],
  );

  console.log(`Target ${target.id} published`);
}
