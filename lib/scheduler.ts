import cron from "node-cron";
import { recoverTargets } from "./scheduler/recoverTargets";
import { claimTargets } from "./scheduler/claimTargets";
import { processTarget } from "./scheduler/processTarget";
import { handleTargetSuccess } from "./scheduler/handleTargetSuccess";
import { handleTargetFailure } from "./scheduler/handleTargetFailure";
import { createEvent } from "./events";
import { logger } from "./logger";

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

      logger.info(`Claimed Targets: ${targets.length}`);

      if (targets.length === 0) {
        await createEvent(
          "SCHEDULER_CYCLE_COMPLETED",
          "scheduler",
          0,
          undefined,
          {
            processed: 0,
          },
        );

        logger.info("No targets to process");

        return;
      }

      /*
          Process targets
        */
      for (const target of targets) {
        let post = null;
        let account = null;
        let userId = null;

        try {
          ({ post, account, userId } = await processTarget(target));

          await handleTargetSuccess(target, post, account);
        } catch (error) {
          logger.error(`Target ${target.id} failed`, error);

          try {
            await handleTargetFailure({
              target,
              post,
              account,
              userId,
              error,
            });
          } catch (failureHandlerError) {
            logger.error("Failure handler crashed", failureHandlerError);
          }
        }
      }

      await createEvent(
        "SCHEDULER_CYCLE_COMPLETED",
        "scheduler",
        0,
        undefined,
        {
          processed: targets.length,
        },
      );

      logger.info("Scheduler cycle completed");
    } catch (error) {
      logger.error("Scheduler Error", error);

      await createEvent("SCHEDULER_CYCLE_FAILED", "scheduler", 0, undefined, {
        error: String(error),
      });
    }
  });
}
