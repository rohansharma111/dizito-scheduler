import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
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

  try {
    const result = await pool.query(
      `
        SELECT pages
        FROM oauth_page_selections
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
      [userId],
    );

    if (result.rows.length === 0) {
      return Response.json(
        {
          error: "Google Business OAuth session not found.",
        },
        {
          status: 404,
        },
      );
    }

    const payload =
      typeof result.rows[0].pages === "string"
        ? JSON.parse(result.rows[0].pages)
        : result.rows[0].pages;

    return Response.json(payload.locations ?? []);
  } catch (error) {
    console.error("Google Business locations error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Google Business locations.",
      },
      {
        status: 500,
      },
    );
  }
}
