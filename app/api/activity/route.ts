import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const limit = Number(searchParams.get("limit") || 100);

    const result = await pool.query(
      `
        SELECT
          id,
          event_type,
          entity_type,
          entity_id,
          payload,
          created_at
        FROM system_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
      [userId, limit],
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error("Activity API Error:", error);

    return Response.json(
      {
        error: "Failed to load activity",
      },
      {
        status: 500,
      },
    );
  }
}
