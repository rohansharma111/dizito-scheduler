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
              'status', pt.status,
              'social_account_id',
              pt.social_account_id
            )
          )
          FILTER (
            WHERE pt.id
            IS NOT NULL
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

  try {
    await pool.query("BEGIN");

    // update post

    await pool.query(
      `
      UPDATE posts
      SET
        post = $1,
        image_url = $2,
        schedule_time = $3,
        status = $4,
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        body.post,
        body.image_url ?? post.image_url,
        body.schedule_time ?? post.schedule_time,
        newStatus,
        id,
      ],
    );

    // update targets

    if (Array.isArray(body.social_account_ids)) {
      // remove old targets

      await pool.query(
        `
        DELETE
        FROM post_targets
        WHERE post_id = $1
        `,
        [id],
      );

      // fetch selected accounts

      const accounts = await pool.query(
        `
          SELECT
            id,
            platform
          FROM social_accounts
          WHERE
            id = ANY($1)
            AND user_id = $2
          `,
        [body.social_account_ids, (session.user as any).id],
      );

      // recreate targets

      for (const account of accounts.rows) {
        await pool.query(
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
            account.id,
            account.platform,
            newStatus === "draft" ? "draft" : "scheduled",
          ],
        );
      }
    }

    // draft -> scheduled migration

    if (post.status === "draft" && newStatus === "scheduled") {
      await pool.query(
        `
        UPDATE post_targets
        SET
          status =
            'scheduled'
        WHERE
          post_id = $1
        `,
        [id],
      );
    }

    await pool.query("COMMIT");

    return Response.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    await pool.query("ROLLBACK");

    console.error(error);

    return Response.json(
      {
        error: "Failed to update post",
      },
      {
        status: 500,
      },
    );
  }
}
