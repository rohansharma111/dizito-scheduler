import { pool } from "@/lib/db";
import { startScheduler } from "@/lib/scheduler";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

startScheduler();

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
      {
        status: 401,
      },
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

  if (!body.selectedAccounts || body.selectedAccounts.length === 0) {
    return Response.json(
      {
        error: "Select at least one account",
      },
      {
        status: 400,
      },
    );
  }

  const accounts = await pool.query(
    `
      SELECT *
      FROM social_accounts
      WHERE
        id = ANY($1)
        AND user_id = $2
      `,
    [body.selectedAccounts, (session.user as any).id],
  );

  if (accounts.rows.length !== body.selectedAccounts.length) {
    return Response.json(
      {
        error: "Invalid account selection",
      },
      {
        status: 400,
      },
    );
  }

  const postResult = await pool.query(
    `
      INSERT INTO posts
      (
        post,
        schedule_time,
        status,
        image_url,
        user_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *
      `,
    [
      body.post,
      body.scheduleTime,
      status,
      body.imageUrl,
      (session.user as any).id,
    ],
  );

  const postId = postResult.rows[0].id;

  for (const account of accounts.rows) {
    await pool.query(
      `
      INSERT INTO post_targets
      (
        post_id,
        social_account_id,
        platform,
        status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      `,
      [postId, account.id, account.platform, status],
    );
  }

  return Response.json({
    success: true,
    post: postResult.rows[0],
    targets: accounts.rows.length,
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
