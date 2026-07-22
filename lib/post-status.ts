import { pool } from "./db";

export async function updatePostStatus(postId: number) {
  /*
    Fetch all target statuses
  */
  const result = await pool.query(
    `
      SELECT status
      FROM post_targets
      WHERE post_id = $1
    `,
    [postId],
  );

  const statuses = result.rows.map((r) => r.status);

  if (statuses.length === 0) {
    return;
  }

  /*
    Status helpers
  */
  const allDraft = statuses.every((s) => s === "draft");
  const allScheduled = statuses.every((s) => s === "scheduled");
  const allPublished = statuses.every((s) => s === "published");
  const allFailed = statuses.every((s) => s === "failed");
  const allPermanentFailed = statuses.every((s) => s === "permanent_failed");

  const hasPublished = statuses.includes("published");
  const hasProcessing = statuses.includes("processing");
  const hasFailed = statuses.includes("failed");
  const hasPermanentFailed = statuses.includes("permanent_failed");
  const hasScheduled = statuses.includes("scheduled");
  const hasDraft = statuses.includes("draft");

  let postStatus = "scheduled";

  /*
    Draft
  */
  if (allDraft) {
    postStatus = "draft";
  } else if (allScheduled) {

  /*
    Scheduled
  */
    postStatus = "scheduled";
  } else if (allPublished) {

  /*
    Fully Published
  */
    postStatus = "published";
  } else if (allFailed) {

  /*
    Fully Failed
  */
    postStatus = "failed";
  } else if (allPermanentFailed) {

  /*
    Fully Permanent Failed
  */
    postStatus = "permanent_failed";
  } else if (hasProcessing) {

  /*
    Processing
    (At least one platform is currently publishing.)
  */
    postStatus = "processing";
  } else if (hasPublished && (hasFailed || hasPermanentFailed)) {

  /*
    Partial Failed
    (Some published, some failed.)
  */
    postStatus = "partial_failed";
  } else if (hasScheduled && (hasFailed || hasPermanentFailed)) {

  /*
    Mixed scheduled + failures
  */
    postStatus = "processing";
  } else if (hasDraft && hasScheduled) {

  /*
    Draft mixed with scheduled
  */
    postStatus = "draft";
  } else {

  /*
    Everything else
  */
    postStatus = "processing";
  }

  /*
    Update overall post status
  */
  await pool.query(
    `
      UPDATE posts
      SET status = $1
      WHERE id = $2
    `,
    [postStatus, postId],
  );

  /*
    First successful publish
    (Even if other platforms fail later.)
  */
  if (hasPublished) {
    await pool.query(
      `
        UPDATE posts
        SET published_at = COALESCE(published_at, NOW())
        WHERE id = $1
      `,
      [postId],
    );
  }

  console.log(`POST ${postId} STATUS => ${postStatus}`);

  return postStatus;
}
