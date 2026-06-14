import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {

  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user) {

    return Response.json(
      {
        error: "Unauthorized",
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
      FROM posts
      WHERE
        id = $1
        AND user_id = $2
      `,
      [
        params.id,
        (session.user as any).id,
      ]
    );

  if (
    result.rows.length === 0
  ) {

    return Response.json(
      {
        error: "Post not found",
      },
      {
        status: 404,
      }
    );

  }

  return Response.json(
    result.rows[0]
  );

}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {

  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user) {

    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );

  }

  const body =
    await request.json();

  const existingPost =
    await pool.query(
      `
      SELECT *
      FROM posts
      WHERE
        id = $1
        AND user_id = $2
      `,
      [
        params.id,
        (session.user as any).id,
      ]
    );

  if (
    existingPost.rows.length === 0
  ) {

    return Response.json(
      {
        error: "Post not found",
      },
      {
        status: 404,
      }
    );

  }

  const post =
    existingPost.rows[0];

  if (
    ![
      "scheduled",
      "failed",
    ].includes(
      post.status
    )
  ) {

    return Response.json(
      {
        error:
          "Only scheduled or failed posts can be edited",
      },
      {
        status: 400,
      }
    );

  }

  await pool.query(
    `
    UPDATE posts
    SET
      post = $1,
      schedule_time = $2
    WHERE id = $3
    `,
    [
      body.post,
      body.schedule_time,
      params.id,
    ]
  );

  return Response.json({
    success: true,
  });

}