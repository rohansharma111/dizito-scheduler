import cron from "node-cron";
import { pool } from "./db";
import { publishers } from "./publishers";

let started = false;

export function startScheduler() {
  if (started) return;

  started = true;

  console.log("DIZITO_V4_SCHEDULER_STARTED");

  cron.schedule("* * * * *", async () => {
    try {
      console.log("=================================");
      console.log("DIZITO_V4_SCHEDULER_RUNNING");
      console.log("Time:", new Date().toISOString());

      /*
        Recover stuck targets
      */

      await pool.query(`
        UPDATE post_targets
        SET
          status = 'scheduled',
          processing_started_at = NULL
        WHERE
          status = 'processing'
          AND processing_started_at <
              NOW() - INTERVAL '15 minutes'
      `);

      /*
        Atomically claim targets
      */

      const result = await pool.query(`
          UPDATE post_targets
          SET
            status = 'processing',
            processing_started_at = NOW()
          WHERE id IN (
            SELECT pt.id
            FROM post_targets pt
            JOIN posts p
              ON p.id = pt.post_id
            WHERE
              pt.status = 'scheduled'
              AND p.schedule_time <= NOW()
            LIMIT 20
          )
          RETURNING *
        `);

      console.log("Claimed Targets:", result.rows.length);

      if (result.rows.length === 0) {
        console.log("No targets to process");

        return;
      }

      for (const target of result.rows) {
        try {
          console.log(`Processing Target ${target.id} (${target.platform})`);

          const publisher =
            publishers[
              target.platform.toLowerCase() as keyof typeof publishers
            ];

          if (!publisher) {
            throw new Error(`Unsupported platform: ${target.platform}`);
          }

          /*
            Load post
          */

          const postResult = await pool.query(
            `
              SELECT *
              FROM posts
              WHERE id = $1
              `,
            [target.post_id],
          );

          const post = postResult.rows[0];

          if (!post) {
            throw new Error("Post not found");
          }

          /*
            Load account
          */

          const accountResult = await pool.query(
            `
              SELECT *
              FROM social_accounts
              WHERE id = $1
              `,
            [target.social_account_id],
          );

          const account = accountResult.rows[0];

          if (!account) {
            throw new Error("Account not found");
          }

          /*
            Publisher context
          */

          const context = {
            post,
            target,
            account,
          };

          /*
            Publish
          */

          await publisher(context);

          /*
            Mark target success
          */

          await pool.query(
            `
            UPDATE post_targets
            SET
              status = 'published',
              published_at = NOW(),
              processing_started_at = NULL
            WHERE id = $1
            `,
            [target.id],
          );

          /*
            Check remaining
          */

          const remainingTargets = await pool.query(
            `
              SELECT COUNT(*) AS count
              FROM post_targets
              WHERE
                post_id = $1
                AND status != 'published'
              `,
            [target.post_id],
          );

          if (Number(remainingTargets.rows[0].count) === 0) {
            await pool.query(
              `
              UPDATE posts
              SET
                status = 'published',
                published_at = NOW()
              WHERE id = $1
              `,
              [target.post_id],
            );

            console.log(`Post ${target.post_id} fully published`);
          }

          /*
            Logs
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
        } catch (error) {
          console.error(`Target ${target.id} failed`, error);

          /*
            Mark target failed
          */

          await pool.query(
            `
            UPDATE post_targets
            SET
              status = 'failed',
              publish_message = $1,
              processing_started_at = NULL
            WHERE id = $2
            `,
            [String(error), target.id],
          );

          /*
            Temporary aggregate
          */

          await pool.query(
            `
            UPDATE posts
            SET
              status = 'failed',
              publish_message = $1
            WHERE id = $2
            `,
            [String(error), target.post_id],
          );

          /*
            Logs
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
            [target.post_id, "failed", String(error)],
          );
        }
      }

      console.log("Scheduler cycle completed");
    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  });
}
