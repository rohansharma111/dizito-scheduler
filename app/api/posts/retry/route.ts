import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updatePostStatus } from "@/lib/post-status";

const MAX_MANUAL_RETRIES = 3;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const body = await request.json();

  /*
      Load target
    */
  const targetResult = await pool.query(
    `
      SELECT
        pt.*,
        p.user_id
      FROM post_targets pt
      JOIN posts p
        ON p.id = pt.post_id
      WHERE
        pt.id = $1
      `,
    [body.targetId],
  );

  const target = targetResult.rows[0];

  if (!target) {
    return Response.json(
      {
        error: "Target not found",
      },
      {
        status: 404,
      },
    );
  }

  if (target.user_id !== (session.user as any).id) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 403,
      },
    );
  }

  /*
      Manual retry limit
    */
  if (target.manual_retry_count >= MAX_MANUAL_RETRIES) {
    return Response.json(
      {
        error: "Maximum manual retries exceeded",
      },
      {
        status: 400,
      },
    );
  }

  /*
      Give fresh auto retry budget
    */
  await pool.query(
    `
    UPDATE post_targets
    SET
      status='scheduled',
      retry_count=0,
      manual_retry_count =
        manual_retry_count + 1,
      next_retry_at=NULL,
      publish_message=NULL,
      processing_started_at=NULL,
      publish_lock_uuid=NULL
    WHERE id=$1
    `,
    [body.targetId],
  );

  /*
      Recompute parent post
    */
  await updatePostStatus(target.post_id);

  return Response.json({
    success: true,
    manualRetriesUsed: target.manual_retry_count + 1,
    manualRetriesRemaining: MAX_MANUAL_RETRIES - target.manual_retry_count - 1,
  });
}
