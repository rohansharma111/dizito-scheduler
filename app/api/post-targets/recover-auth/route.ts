import { pool } from "@/lib/db";
import { updatePostStatus } from "@/lib/post-status";
import { createEvent } from "@/lib/events";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const internalSecret = request.headers.get("x-dizito-internal-secret");
    const configuredSecret = process.env.NEXTAUTH_SECRET;
    const sessionUserId = session?.user ? Number((session.user as any).id) : null;
    const internalUserId = Number(body.userId);
    const isInternal = Boolean(configuredSecret && internalSecret === configuredSecret);

    if (!sessionUserId && !isInternal) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionUserId ?? internalUserId;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.socialAccountId) {
      return Response.json(
        {
          error: "socialAccountId required",
        },
        {
          status: 400,
        },
      );
    }

    const socialAccountId = Number(body.socialAccountId);

    /*
      Find auth failures
    */
    const result = await pool.query(
      `
        SELECT
          pt.*,
          p.user_id
        FROM post_targets pt
        JOIN posts p
          ON p.id = pt.post_id
        WHERE
          pt.social_account_id = $1
          AND p.user_id = $2
          AND pt.status IN (
  'retry_scheduled',
  'permanent_failed',
  'failure_handler_crashed'
)
        `,
      [socialAccountId, userId],
    );

    if (result.rows.length === 0) {
      return Response.json({
        success: true,
        recovered: 0,
      });
    }

    /*
      Recover targets
    */
    for (const target of result.rows) {
      await pool.query(
        `
        UPDATE post_targets
        SET
          status='scheduled',
          next_retry_at=NULL,
          publish_message=NULL,
          processing_started_at=NULL,
          publish_lock_uuid=NULL,
          published_at=NULL
        WHERE id=$1
        `,
        [target.id],
      );

      /*
        Recompute post
      */
      await updatePostStatus(target.post_id);

      /*
        Event
      */
      await createEvent(
        "TARGET_AUTH_RECOVERED",
        "post_target",
        target.id,
        target.user_id,
        {
          platform: target.platform,
          postId: target.post_id,
          socialAccountId,
          automaticRetries: target.retry_count,
          manualRetries: target.manual_retry_count,
        },
      );
    }

    return Response.json({
      success: true,
      recovered: result.rows.length,
    });
  } catch (error) {
    console.error("Recover auth error", error);

    return Response.json(
      {
        error: "Failed to recover auth targets",
      },
      {
        status: 500,
      },
    );
  }
}
