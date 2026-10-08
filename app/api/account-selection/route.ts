import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM oauth_page_selections
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [(session.user as any).id],
    );

    if (result.rows.length === 0) {
      return Response.json({
        pages: [],
      });
    }

    const oauthData = resolveOAuthSelectionCredentials(result.rows[0]);

    if (!oauthData.pages) {
      return Response.json({
        pages: [],
      });
    }

    let pages: unknown;

    try {
      pages = JSON.parse(oauthData.pages);
    } catch {
      return Response.json(
        {
          error: "Meta account-selection session is invalid.",
        },
        {
          status: 502,
        },
      );
    }

    return Response.json({
      pages: Array.isArray(pages) ? pages : [],
    });
  } catch (error) {
    console.error("Meta account selection error:", error);

    return Response.json(
      {
        error: "Failed to load Meta account selection.",
      },
      {
        status: 500,
      },
    );
  }
}
