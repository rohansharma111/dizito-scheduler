import cron from "node-cron";
import { recoverTargets } from "./scheduler/recoverTargets";
import { claimTargets } from "./scheduler/claimTargets";
import { createEvent } from "./events";
import { logger } from "./logger";
import { updateHeartbeat } from "./scheduler/updateHeartbeat";
import { processOneTarget } from "./scheduler/processOneTarget";

let started = false;

export function startScheduler() {
  if (started) return;

  started = true;

  logger.info("DIZITO_V7_SCHEDULER_STARTED");

  cron.schedule("* * * * *", async () => {
    try {
      logger.info("=================================");

      logger.info("DIZITO_V7_SCHEDULER_RUNNING");

      logger.info(new Date().toISOString());

      await createEvent("SCHEDULER_CYCLE_STARTED", "scheduler", 0, undefined, {
        timestamp: new Date(),
      });

      /*
          Recover stuck targets
        */
      await recoverTargets();

      /*
          Claim targets
        */
      const targets = await claimTargets();
      const metrics = {
        claimed: targets.length,
        published: 0,
        failed: 0,
        permanentFailed: 0,
        retried: 0,
      };
      logger.info(`Claimed Targets: ${targets.length}`);

      if (targets.length === 0) {
        await createEvent(
          "SCHEDULER_CYCLE_COMPLETED",
          "scheduler",
          0,
          undefined,
          metrics,
        );

        logger.info("No targets to process");
        await updateHeartbeat({
          claimed: 0,
          published: 0,
          failed: 0,
          permanentFailed: 0,
          retried: 0,
        });
        return;
      }

      /*
          Process targets
        */
      for (const target of targets) {
        const result = await processOneTarget(target);

        if (result.success) {
          metrics.published++;
        } else {
          metrics.failed++;

          if (result.status === "permanent_failed") {
            metrics.permanentFailed++;
          }

          if (result.status === "retry_scheduled") {
            metrics.retried++;
          }
        }
      }

      await createEvent(
        "SCHEDULER_CYCLE_COMPLETED",
        "scheduler",
        0,
        undefined,
        metrics,
      );
      await updateHeartbeat(metrics);
      logger.info("Scheduler cycle completed");
    } catch (error) {
      logger.error("Scheduler Error", error);

      await createEvent("SCHEDULER_CYCLE_FAILED", "scheduler", 0, undefined, {
        error: String(error),
      });
    }
  });
}
