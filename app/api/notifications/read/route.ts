import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  try {
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

    const userId = (session.user as any).id;

    const body = await request.json();

    const { id, markAll } = body;

    /*
      Mark all notifications read
    */
    if (markAll) {
      const result = await pool.query(
        `
          UPDATE system_events
          SET is_read = TRUE
          WHERE
            user_id = $1
            AND is_read = FALSE
            AND event_type = ANY($2)
          RETURNING id
          `,
        [
          userId,
          [
            "TARGET_PUBLISHED",
            "TARGET_FAILED",
            "TARGET_RETRY_SCHEDULED",
            "TARGET_PERMANENT_FAILED",
            "ACCOUNT_CONNECTED",
            "ACCOUNT_DISCONNECTED",
            "ACCOUNT_EXPIRED",
          ],
        ],
      );

      return Response.json({
        success: true,
        updated: result.rowCount,
      });
    }

    /*
      Mark one notification read
    */
    if (!id) {
      return Response.json(
        {
          error: "Notification id required",
        },
        {
          status: 400,
        },
      );
    }

    const result = await pool.query(
      `
        UPDATE system_events
        SET is_read = TRUE
        WHERE
          id = $1
          AND user_id = $2
          AND event_type = ANY($3)
        RETURNING *
        `,
      [
        id,
        userId,
        [
          "TARGET_PUBLISHED",
          "TARGET_FAILED",
          "TARGET_RETRY_SCHEDULED",
          "TARGET_PERMANENT_FAILED",
          "ACCOUNT_CONNECTED",
          "ACCOUNT_DISCONNECTED",
          "ACCOUNT_EXPIRED",
        ],
      ],
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          error: "Notification not found",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      success: true,
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Notification read error:", error);

    return Response.json(
      {
        error: "Failed to update notification",
      },
      {
        status: 500,
      },
    );
  }
}
