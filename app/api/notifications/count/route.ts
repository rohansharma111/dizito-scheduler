import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET() {
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

    const result = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM system_events
        WHERE
          user_id = $1
          AND is_read = FALSE
          AND event_type IN (
            'TARGET_PUBLISHED',
            'TARGET_FAILED',
            'TARGET_RETRY_SCHEDULED',
            'TARGET_PERMANENT_FAILED',
            'ACCOUNT_CONNECTED',
            'ACCOUNT_DISCONNECTED',
            'ACCOUNT_EXPIRED'
          )
        `,
      [userId],
    );

    return Response.json({
      count: Number(result.rows[0].count),
    });
  } catch (error) {
    console.error("Notification count error:", error);

    return Response.json(
      {
        error: "Failed to load notification count",
      },
      {
        status: 500,
      },
    );
  }
}
