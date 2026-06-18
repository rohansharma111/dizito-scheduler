import { pool } from "@/lib/db";
import { startScheduler } from "@/lib/scheduler";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//startScheduler();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const result = await pool.query(
    `
    SELECT *
    FROM posts
    WHERE user_id = $1
    ORDER BY id DESC
    `,
    [(session.user as any).id],
  );

  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const allowedStatuses = ["draft", "scheduled"];

  const status = body.status || "scheduled";

  if (!allowedStatuses.includes(status)) {
    return Response.json(
      {
        error: "Invalid status",
      },
      {
        status: 400,
      },
    );
  }

  // Scheduled posts require date/time
  if (status === "scheduled" && !body.scheduleTime) {
    return Response.json(
      {
        error: "Schedule time is required",
      },
      {
        status: 400,
      },
    );
  }

  // SECURITY CHECK
  const account = await pool.query(
    `
      SELECT id
      FROM social_accounts
      WHERE
        id = $1
        AND user_id = $2
      `,
    [body.socialAccountId, (session.user as any).id],
  );

  if (account.rows.length === 0) {
    return Response.json(
      {
        error: "Invalid account",
      },
      {
        status: 400,
      },
    );
  }

  const result = await pool.query(
    `
      INSERT INTO posts
      (
        post,
        platform,
        schedule_time,
        status,
        image_url,
        social_account_id,
        user_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *
      `,
    [
      body.post,
      body.platform,
      body.scheduleTime,
      status,
      body.imageUrl,
      body.socialAccountId,
      (session.user as any).id,
    ],
  );

  return Response.json({
    success: true,
    post: result.rows[0],
  });
}

export async function DELETE(request: Request) {
  const body = await request.json();

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  await pool.query(
    `
    DELETE FROM posts
    WHERE id = $1
    AND user_id = $2
    `,
    [body.id, (session.user as any).id],
  );

  return Response.json({
    success: true,
  });
}
