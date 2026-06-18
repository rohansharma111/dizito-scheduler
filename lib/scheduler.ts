import cron from "node-cron";
import { pool } from "./db";
import { publishToLinkedIn } from "./publishers/linkedin";
import { publishToInstagram } from "./publishers/instagram";
import { publishToFacebook } from "./publishers/facebook";
let started = false;

export function startScheduler() {
  if (started) return;

  started = true;

  console.log("DIZITO_SCHEDULER_STARTED");

  cron.schedule("* * * * *", async () => {
    try {
      console.log("=================================");
      console.log("DIZITO_V2_SCHEDULER_RUNNING");
      console.log("Time:", new Date().toISOString());

      // Recover stuck posts
      const recoveryResult = await pool.query(`
        UPDATE posts
        SET
          status = 'scheduled',
          processing_started_at = NULL
        WHERE
          status = 'processing'
          AND processing_started_at <
              NOW() - INTERVAL '15 minutes'
        RETURNING id
      `);

      if (recoveryResult.rows.length > 0) {
        console.log(
          "Recovered Posts:",
          recoveryResult.rows.map((p) => p.id),
        );
      }

      // Claim posts atomically
      const result = await pool.query(`
        UPDATE posts
        SET
          status = 'processing',
          processing_started_at = NOW()
        WHERE id IN (
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

      if (result.rows.length === 0) {
        console.log("No posts to process");
        return;
      }

      console.log(
        "Post IDs:",
        result.rows.map((p) => p.id),
      );

      for (const post of result.rows) {
        try {
          console.log(`Processing Post ${post.id} (${post.platform})`);

          switch (post.platform?.toLowerCase()) {
            case "instagram":
              await publishToInstagram(post.id);
              break;

            case "facebook":
              await publishToFacebook(post.id);
              break;

            case "linkedin":
              await publishToLinkedIn(post.id);
              break;

            default:
              throw new Error(`Unsupported platform: ${post.platform}`);
          }

          await pool.query(
            `
            UPDATE posts
            SET
              status = 'published',
              published_at = NOW(),
              processing_started_at = NULL
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

          console.log(`Post ${post.id} published successfully`);
        } catch (error) {
          console.error(`Post ${post.id} failed`, error);

          await pool.query(
            `
            UPDATE posts
            SET
              status = 'failed',
              publish_message = $1,
              processing_started_at = NULL
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

      console.log("Scheduler cycle completed");
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  });
}
