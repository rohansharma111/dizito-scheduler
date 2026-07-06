import cron from "node-cron";
import { checkAccounts } from "@/lib/accountHealth/checkAccounts";
import { logger } from "@/lib/logger";

export function startAccountHealthScheduler() {
  cron.schedule("0 */6 * * *", async () => {
    try {
      logger.info("ACCOUNT_HEALTH_CHECK_STARTED");

      const result = await checkAccounts();

      logger.info("ACCOUNT_HEALTH_CHECK_COMPLETED", result);
    } catch (error) {
      logger.error("ACCOUNT_HEALTH_CHECK_FAILED", error);
    }
  });
}
