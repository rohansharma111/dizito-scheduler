import { pool } from "@/lib/db";

import { getServerSession }
from "next-auth";

import { authOptions }
from "@/lib/auth";

export async function GET() {

  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user) {

    return Response.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );

  }

  const result =
    await pool.query(
      `
      SELECT *
      FROM oauth_page_selections
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        (session.user as any).id
      ]
    );

  if (
    result.rows.length === 0
  ) {

    return Response.json({
      pages: [],
    });

  }

  return Response.json({
    pages:
      result.rows[0].pages,
  });

}