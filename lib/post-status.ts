import { pool } from "./db";

export async function updatePostStatus(postId: number) {
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

  let postStatus = "scheduled";

  /*
    Draft
  */
  if (statuses.every((s) => s === "draft")) {
    postStatus = "draft";
  } else if (statuses.some((s) => s === "processing")) {

  /*
    Processing
  */
    postStatus = "processing";
  } else if (statuses.every((s) => s === "published")) {

  /*
    Fully Published
  */
    postStatus = "published";
  } else if (statuses.every((s) => s === "permanent_failed")) {

  /*
    Permanent Failed
  */
    postStatus = "permanent_failed";
  } else if (

  /*
    Partial Failed
  */
    statuses.some((s) => s === "failed" || s === "permanent_failed") &&
    statuses.some((s) => s === "published")
  ) {
    postStatus = "partial_failed";
  } else if (statuses.every((s) => s === "failed")) {

  /*
    Fully Failed
  */
    postStatus = "failed";
  } else if (statuses.every((s) => s === "scheduled")) {

  /*
    Scheduled
  */
    postStatus = "scheduled";
  } else {

  /*
    Mixed state fallback
  */
    postStatus = "partial_failed";
  }

  /*
    Update status
  */
  await pool.query(
    `
    UPDATE posts
    SET
      status = $1
    WHERE id = $2
    `,
    [postStatus, postId],
  );

  /*
    First successful publish
  */
  if (postStatus === "published") {
    await pool.query(
      `
      UPDATE posts
      SET
        published_at =
          COALESCE(
            published_at,
            NOW()
          )
      WHERE id = $1
      `,
      [postId],
    );
  }

  console.log(`POST ${postId} STATUS => ${postStatus}`);

  return postStatus;
}
