import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { resolveOAuthSelectionCredentials } from "@/lib/security/social-oauth-selection";

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
      SELECT *
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
          error: "Pinterest OAuth session not found.",
        },
        {
          status: 404,
        },
      );
    }

    const oauthData = resolveOAuthSelectionCredentials(result.rows[0]);

    if (!oauthData.pages) {
      return Response.json([]);
    }

    let payload: { boards?: unknown[] };

    try {
      payload =
        typeof oauthData.pages === "string"
          ? JSON.parse(oauthData.pages)
          : oauthData.pages;
    } catch {
      return Response.json(
        {
          error: "Pinterest board session is invalid.",
        },
        {
          status: 502,
        },
      );
    }

    return Response.json(Array.isArray(payload?.boards) ? payload.boards : []);
  } catch (error) {
    console.error("Pinterest boards error:", error);

    return Response.json(
      {
        error: "Failed to load Pinterest boards.",
      },
      {
        status: 500,
      },
    );
  }
}
