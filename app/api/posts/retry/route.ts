import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
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
  await pool.query(
    `
  UPDATE posts
  SET
    status = 'scheduled',
    publish_message = NULL
  WHERE
    id = $1
    AND user_id = $2
  `,
    [body.id, (session.user as any).id],
  );

  return Response.json({
    success: true,
  });
}
