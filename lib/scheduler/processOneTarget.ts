import { logger } from "../logger";

import { processTarget } from "./processTarget";

import { handleTargetSuccess } from "./handleTargetSuccess";

import { handleTargetFailure } from "./handleTargetFailure";

export async function processOneTarget(target: any) {
  let post = null;
  let account = null;
  let userId = null;

  try {
    logger.info(`Processing Target ${target.id} (${target.platform})`);

    ({ post, account, userId } = await processTarget(target));

    await handleTargetSuccess(target, post, account);

    return {
      success: true,

      status: "published",
    };
  } catch (error) {
    logger.error(`Target ${target.id} failed`, error);

    try {
      const result = await handleTargetFailure({
        target,
        post,
        account,
        userId,
        error,
      });

      return {
        success: false,

        status: result.status,
      };
    } catch (failureHandlerError) {
      logger.error("Failure handler crashed", failureHandlerError);

      return {
        success: false,

        status: "failure_handler_crashed",
      };
    }
  }
}
