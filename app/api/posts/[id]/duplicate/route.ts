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

  // Verify ownership
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

  const original = postResult.rows[0];

  // Prevent duplicating
  // actively processing posts
  const processing = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM post_targets
      WHERE
        post_id = $1
        AND status = 'processing'
      `,
    [id],
  );

  if (Number(processing.rows[0].count) > 0) {
    return Response.json(
      {
        error: "Cannot duplicate processing post",
      },
      {
        status: 400,
      },
    );
  }

  // Load targets
  const targetsResult = await pool.query(
    `
      SELECT *
      FROM post_targets
      WHERE post_id = $1
      `,
    [id],
  );

  // Create duplicate post
  const duplicate = await pool.query(
    `
      INSERT INTO posts
      (
        post,
        schedule_time,
        image_url,
        user_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
    [
      original.post,
      null, // draft
      original.image_url,
      original.user_id,
    ],
  );

  const duplicatedPost = duplicate.rows[0];

  // Duplicate all targets
  for (const target of targetsResult.rows) {
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
      [duplicatedPost.id, target.social_account_id, target.platform, "draft"],
    );
  }

  return Response.json({
    success: true,
    post: duplicatedPost,
    targets: targetsResult.rows.length,
  });
}
