import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {

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

  await pool.query(
    `
    DELETE
    FROM social_accounts
    WHERE id = $1
    AND user_id = $2
    `,
    [
      params.id,
      (session.user as any).id,
    ]
  );

  return Response.json({
    success: true,
  });

}