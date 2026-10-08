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

        m.id AS media_id,
m.user_id AS media_user_id,
m.media_type,
m.duration_seconds,
m.poster_url,
m.processing_state,
m.upload_protocol,
m.processing_error,
m.metadata,
m.cloudinary_public_id,
m.secure_url,
m.file_name,
m.mime_type,
m.format,
m.resource_type,
m.width,
m.height,
m.bytes,
m.folder,
m.tags,
m.created_at AS media_created_at,
m.updated_at AS media_updated_at,
m.deleted_at AS media_deleted_at,

        COALESCE(
          json_agg(
            json_build_object(
              'id', pt.id,
              'platform', pt.platform,
              'status', pt.status,
              'social_account_id', pt.social_account_id
            )
          )
          FILTER (
            WHERE pt.id IS NOT NULL
          ),
          '[]'
        ) AS targets

      FROM posts p

      LEFT JOIN media_library m
        ON p.media_id = m.id
        AND m.user_id = p.user_id
        AND m.deleted_at IS NULL

      LEFT JOIN post_targets pt
        ON pt.post_id = p.id

      WHERE
        p.id = $1
        AND p.user_id = $2

      GROUP BY
        p.id,
        m.id

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

  if (
    !Array.isArray(body.selectedAccounts) ||
    body.selectedAccounts.length === 0
  ) {
    return Response.json(
      {
        error: "Please select at least one target account",
      },
      {
        status: 400,
      },
    );
  }

  if (body.scheduleMode && !body.scheduleTime) {
    return Response.json(
      {
        error: "Please select a schedule time",
      },
      {
        status: 400,
      },
    );
  }

  const userId = (session.user as any).id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
      Load post
    */

    const postResult = await client.query(
      `
      SELECT *
      FROM posts
      WHERE
        id = $1
        AND user_id = $2
      `,
      [id, userId],
    );

    if (postResult.rows.length === 0) {
      await client.query("ROLLBACK");

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

    /*
      Editable statuses only
    */

    if (
      ![
        "draft",
        "scheduled",
        "retry_scheduled",
        "permanent_failed",
        "failure_handler_crashed",
      ].includes(post.status)
    ) {
      await client.query("ROLLBACK");

      return Response.json(
        {
          error: "Cannot edit this post",
        },
        {
          status: 400,
        },
      );
    }

    /*
      VERIFY MEDIA SELECTION
      - Omitted mediaId keeps the existing media.
      - null/empty mediaId clears the media.
      - A selected asset must belong to the tenant, be active, and be ready.
    */

    const hasMediaId = Object.prototype.hasOwnProperty.call(body, "mediaId");
    const mediaId =
      !hasMediaId || body.mediaId === null || body.mediaId === ""
        ? hasMediaId
          ? null
          : post.media_id
        : Number(body.mediaId);

    if (
      mediaId !== null &&
      (!Number.isInteger(mediaId) || mediaId <= 0)
    ) {
      throw new Error("Invalid media selection");
    }

    if (mediaId !== null) {
      const media = await client.query(
        `
        SELECT id, processing_state
        FROM media_library
        WHERE
          id = $1
          AND user_id = $2
          AND deleted_at IS NULL
        `,
        [mediaId, userId],
      );

      if (media.rows.length === 0) {
        throw new Error("Invalid media selection");
      }

      if (
        media.rows[0].processing_state &&
        media.rows[0].processing_state !== "ready"
      ) {
        throw new Error("Selected media is not ready for publishing");
      }
    }

    /*
      Determine new status
    */

    let newStatus = post.status;

    if (post.status === "draft" && body.scheduleMode && body.scheduleTime) {
      newStatus = "scheduled";
    }

    /*
      Update post
    */

    await client.query(
      `
      UPDATE posts
      SET
        post = $1,
        media_id = $2,
        schedule_time = $3,
        status = $4,
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        body.post,
        mediaId,
        body.scheduleTime ?? post.schedule_time,
        newStatus,
        id,
      ],
    );

    /*
      Update targets
    */

    await client.query(
      `
      DELETE
      FROM post_targets
      WHERE post_id = $1
      `,
      [id],
    );

    const accounts = await client.query(
      `
      SELECT
        id,
        platform
      FROM social_accounts
      WHERE
        id = ANY($1)
        AND user_id = $2
      `,
      [body.selectedAccounts, userId],
    );

    /*
      Verify ownership of every selected account
    */

    if (accounts.rows.length !== body.selectedAccounts.length) {
      throw new Error("Invalid account selection");
    }

    /*
      Recreate targets
    */

    for (const account of accounts.rows) {
      await client.query(
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
        [
          id,
          account.id,
          account.platform,
          newStatus === "draft" ? "draft" : "scheduled",
        ],
      );
    }

    /*
      Draft -> Scheduled migration
    */

    if (post.status === "draft" && newStatus === "scheduled") {
      await client.query(
        `
        UPDATE post_targets
        SET status = 'scheduled'
        WHERE post_id = $1
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
        error: error instanceof Error ? error.message : "Failed to update post",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
