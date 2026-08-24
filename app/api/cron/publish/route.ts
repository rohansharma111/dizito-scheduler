import { NextResponse } from "next/server";

import { recoverTargets } from "@/lib/scheduler/recoverTargets";
import { claimTargets } from "@/lib/scheduler/claimTargets";
import { updateHeartbeat } from "@/lib/scheduler/updateHeartbeat";
import { processOneTarget } from "@/lib/scheduler/processOneTarget";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("=================================");
    logger.info("DIZITO_V7_SCHEDULER_RUNNING");
    logger.info(new Date().toISOString());

    // 1. Recover targets stuck in processing
    await recoverTargets();

    // 2. Claim due targets
    const targets = await claimTargets();

    const metrics = {
      claimed: targets.length,
      published: 0,
      failed: 0,
      permanentFailed: 0,
      retried: 0,
    };

    logger.info(`Claimed Targets: ${targets.length}`);

    // 3. Nothing to process
    if (targets.length === 0) {
      logger.info("No targets to process");

      await updateHeartbeat({
        claimed: 0,
        published: 0,
        failed: 0,
        permanentFailed: 0,
        retried: 0,
      });

      return NextResponse.json({
        success: true,
        message: "No targets to process",
        metrics,
      });
    }

    // 4. Process claimed targets
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

    // 5. Update scheduler heartbeat
    await updateHeartbeat(metrics);

    logger.info("Scheduler cycle completed");

    return NextResponse.json({
      success: true,
      message: "Scheduler cycle completed",
      metrics,
    });
  } catch (error) {
    logger.error("Scheduler Error", error);

    return NextResponse.json(
      {
        success: false,
        error: "Scheduler failed",
      },
      { status: 500 },
    );
  }
}
