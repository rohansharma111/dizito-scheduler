import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const session =
    await getServerSession(
      authOptions,
    );

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

  const { id } =
    await params;

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
        id,
        (session.user as any).id,
      ],
    );

  if (
    result.rows.length === 0
  ) {
    return Response.json(
      {
        error:
          "Post not found",
      },
      {
        status: 404,
      },
    );
  }

  const original =
    result.rows[0];

  if (
    original.status ===
    "processing"
  ) {
    return Response.json(
      {
        error:
          "Cannot duplicate processing post",
      },
      {
        status: 400,
      },
    );
  }

  const newDate =
    new Date(
      original.schedule_time,
    );

  newDate.setDate(
    newDate.getDate() + 1,
  );

  const duplicate =
    await pool.query(
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
        original.post,
        original.platform,
        newDate,
        original.status,
        original.image_url,
        original.social_account_id,
        original.user_id,
      ],
    );

  return Response.json({
    success: true,
    post: duplicate.rows[0],
  });
}