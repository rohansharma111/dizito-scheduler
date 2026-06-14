import cron from "node-cron";
import { pool } from "./db";
import { publishToLinkedIn } from "./publishers/linkedin";
import { publishToInstagram } from "./publishers/instagram";

let started = false;

export function startScheduler() {
  if (started) return;

  started = true;

  console.log("DIZITO_SCHEDULER_STARTED");

  cron.schedule("* * * * *", async () => {
    try {
      console.log("DIZITO_V2_SCHEDULER_RUNNING...");

      // Recover stuck posts
      await pool.query(`
        UPDATE posts
        SET status = 'scheduled'
        WHERE
          status = 'processing'
          AND processing_started_at <
              NOW() - INTERVAL '15 minutes'
      `);

      // Atomically claim posts
      const result = await pool.query(`
          UPDATE posts
          SET
            status = 'processing',
            processing_started_at = NOW()
          WHERE id IN
          (
            SELECT id
            FROM posts
            WHERE
              status = 'scheduled'
              AND schedule_time <= NOW()
            LIMIT 20
          )
          RETURNING *
        `);

      console.log("Claimed Posts:", result.rows.length);

      console.log(
        "Post IDs:",
        result.rows.map((p) => p.id),
      );

      console.log("Server Time:", new Date().toISOString());

      for (const post of result.rows) {
        try {
          switch (post.platform?.toLowerCase()) {
            case "instagram":
              await publishToInstagram(post.id);
              break;

            case "linkedin":
              await publishToLinkedIn(post.id, post.access_token, post.text);
              break;

            default:
              throw new Error(`Unsupported platform: ${post.platform}`);
          }

          await pool.query(
            `
            UPDATE posts
            SET
              status = 'published'
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

          console.log(`Post ${post.id} published`);
        } catch (error) {
          console.error(`Post ${post.id} failed`, error);

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
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  });
}
