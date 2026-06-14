import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

  const { id } = await params;

  const result = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE
        id = $1
        AND user_id = $2
      `,
    [id, (session.user as any).id],
  );

  if (result.rows.length === 0) {
    return Response.json(
      {
        error: "Post not found",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json(result.rows[0]);
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

  const { id } = await params;

  const body = await request.json();

  // Validate schedule mode
  if (body.scheduleMode && !body.schedule_time) {
    return Response.json(
      {
        error: "Please select a schedule time",
      },
      {
        status: 400,
      },
    );
  }

  const postResult = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE
        id = $1
        AND user_id = $2
      `,
    [id, (session.user as any).id],
  );

  if (postResult.rows.length === 0) {
    return Response.json(
      {
        error: "Post not found",
      },
      {
        status: 404,
      },
    );
  }

  const post = postResult.rows[0];

  if (!["scheduled", "failed", "draft"].includes(post.status)) {
    return Response.json(
      {
        error: "Cannot edit this post",
      },
      {
        status: 400,
      },
    );
  }

  let newStatus = post.status;

  // Draft -> Scheduled
  if (post.status === "draft" && body.scheduleMode && body.schedule_time) {
    newStatus = "scheduled";
  }

  await pool.query(
    `
    UPDATE posts
    SET
      post = $1,
      schedule_time = $2,
      status = $3
    WHERE id = $4
    `,
    [body.post, body.schedule_time ?? post.schedule_time, newStatus, id],
  );

  return Response.json({
    success: true,
    status: newStatus,
  });
}
