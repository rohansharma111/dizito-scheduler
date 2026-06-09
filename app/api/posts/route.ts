import { pool } from "@/lib/db";
import { startScheduler } from "@/lib/scheduler";

startScheduler();

export async function GET() {
  const result = await pool.query("SELECT * FROM posts ORDER BY id DESC");

  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const result = await pool.query(
    `
    INSERT INTO posts
    (
      post,
      platform,
      schedule_time,
      status,
      image_url,
      social_account_id
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6
    )
    RETURNING *
    `,
    [
      body.post,
      body.platform,
      body.scheduleTime,
      "scheduled",
      body.imageUrl,
      body.socialAccountId
    ],
  );

  return Response.json({
    success: true,
    post: result.rows[0],
  });
}

export async function DELETE(request: Request) {
  const body = await request.json();

  await pool.query("DELETE FROM posts WHERE id = $1", [body.id]);

  return Response.json({
    success: true,
  });
}
