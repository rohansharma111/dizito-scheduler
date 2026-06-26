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

  const statuses = result.rows.map((row) => row.status);

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
  } else if (statuses.includes("failed") && statuses.includes("published")) {

  /*
    Partial Failed
  */
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
  }

  await pool.query(
    `
    UPDATE posts
    SET
      status = $1,
      published_at =
        CASE
          WHEN $1 = 'published'
          THEN NOW()
          ELSE published_at
        END
    WHERE id = $2
    `,
    [postStatus, postId],
  );

  console.log(`POST ${postId} STATUS => ${postStatus}`);
}
