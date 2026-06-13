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
      SELECT
        id,
        account_name
      FROM social_accounts
      WHERE user_id = $1
      ORDER BY id
      `,
      [
        (session.user as any).id
      ]
    );

  return Response.json(
    result.rows
  );

}