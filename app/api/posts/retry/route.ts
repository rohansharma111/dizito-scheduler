import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();

  await pool.query(
    `
    UPDATE posts
    SET
      status = 'scheduled',
      publish_message = NULL
    WHERE id = $1
    `,
    [body.id],
  );

  return Response.json({
    success: true,
  });
}
