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
      SELECT
        p.*,

        COALESCE(
          json_agg(
            json_build_object(
              'id', pt.id,
              'platform', pt.platform,
              'social_account_id',
              pt.social_account_id,
              'status',
              pt.status
            )
          )
          FILTER (
            WHERE pt.id IS NOT NULL
          ),
          '[]'
        ) AS targets

      FROM posts p

      LEFT JOIN post_targets pt
      ON pt.post_id = p.id

      WHERE
        p.id = $1
        AND p.user_id = $2

      GROUP BY p.id
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

  if (!["draft", "scheduled", "failed"].includes(post.status)) {
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

  if (post.status === "draft" && body.scheduleMode && body.schedule_time) {
    newStatus = "scheduled";
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE posts
      SET
        post = $1,
        image_url =
          COALESCE(
            $2,
            image_url
          ),
        schedule_time =
          $3,
        status = $4
      WHERE id = $5
      `,
      [
        body.post,
        body.image_url,
        body.schedule_time ?? post.schedule_time,
        newStatus,
        id,
      ],
    );

    /*
      Update targets
    */

    if (Array.isArray(body.targets)) {
      await client.query(
        `
        DELETE
        FROM post_targets
        WHERE post_id = $1
        `,
        [id],
      );

      for (const target of body.targets) {
        await client.query(
          `
          INSERT INTO
          post_targets
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
          [
            id,
            target.social_account_id,
            target.platform,
            newStatus === "draft" ? "draft" : "scheduled",
          ],
        );
      }
    }

    /*
      Draft -> Scheduled
    */

    if (post.status === "draft" && newStatus === "scheduled") {
      await client.query(
        `
        UPDATE
          post_targets
        SET
          status =
            'scheduled'
        WHERE
          post_id = $1
        `,
        [id],
      );
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    return Response.json(
      {
        error: "Failed to update post",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
