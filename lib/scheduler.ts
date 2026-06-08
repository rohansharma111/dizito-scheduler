import cron from "node-cron";
import { pool } from "./db";
import { publishToLinkedIn } from "./publishers/linkedin";
import { publishToInstagram } from "./publishers/instagram";

let started = false;

export function startScheduler() {
  if (started) return;

  started = true;

  cron.schedule("* * * * *", async () => {
    console.log("Checking scheduled posts...");

    const result = await pool.query(`
    SELECT *
    FROM posts
    WHERE status = 'scheduled'
      AND schedule_time <= NOW()
  `);

    for (const post of result.rows) {
      await pool.query(
        `
    UPDATE posts
    SET status = 'processing'
    WHERE id = $1
    `,
        [post.id],
      );

      try {
        //await publishToLinkedIn(post.post);
await publishToInstagram(
  post.id
);
        await pool.query(
          `
      UPDATE posts
      SET status = 'published'
      WHERE id = $1
      `,
          [post.id],
        );

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
          [post.id, "success", "Published successfully"],
        );
      } catch (error) {
        await pool.query(
          `
      UPDATE posts
      SET
        status = 'failed',
        publish_message = $1
      WHERE id = $2
      `,
          [String(error), post.id],
        );

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
          [post.id, "failed", String(error)],
        );
      }
    }
  });
}
