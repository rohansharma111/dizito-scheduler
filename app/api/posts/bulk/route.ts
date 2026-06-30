import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { hasFeature, canCreatePost } from "@/lib/plans";
import { createEvent } from "@/lib/events";

type BulkRow = {
  content: string;
  schedule_time: string;
  image_url?: string;
};

const MAX_BULK_ROWS = 1000;

export async function POST(request: Request) {
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

  const userId = (session.user as any).id;

  const body = await request.json();

  const rows: BulkRow[] = body.rows || [];

  const accounts: number[] = body.accounts || [];

  if (!Array.isArray(rows)) {
    return Response.json(
      {
        error: "Invalid rows payload",
      },
      {
        status: 400,
      },
    );
  }

  if (!Array.isArray(accounts)) {
    return Response.json(
      {
        error: "Invalid accounts payload",
      },
      {
        status: 400,
      },
    );
  }

  if (accounts.length === 0) {
    return Response.json(
      {
        error: "No accounts selected",
      },
      {
        status: 400,
      },
    );
  }

  if (rows.length > MAX_BULK_ROWS) {
    return Response.json(
      {
        error: `Maximum ${MAX_BULK_ROWS} rows allowed`,
      },
      {
        status: 400,
      },
    );
  }

  const client = await pool.connect();

  try {
    /*
      Load user plan
    */
    const userResult = await client.query(
      `
        SELECT plan
        FROM users
        WHERE id = $1
        `,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return Response.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
      Bulk upload access
    */
    if (!hasFeature(user.plan, "bulkUpload")) {
      return Response.json(
        {
          error: "Bulk upload requires Creator plan",
        },
        {
          status: 403,
        },
      );
    }

    /*
      Monthly limit
    */
    const countResult = await client.query(
      `
        SELECT COUNT(*)
        FROM posts
        WHERE
          user_id = $1
          AND created_at >=
              date_trunc(
                'month',
                NOW()
              )
        `,
      [userId],
    );

    const currentPosts = Number(countResult.rows[0].count);

    if (!canCreatePost(user.plan, currentPosts + rows.length)) {
      return Response.json(
        {
          error: "Monthly post limit exceeded",
        },
        {
          status: 403,
        },
      );
    }

    /*
      Validate accounts once
    */
    const accountResult = await client.query(
      `
        SELECT
          id,
          platform,
          account_name
        FROM social_accounts
        WHERE
          user_id = $1
          AND id = ANY($2)
        `,
      [userId, accounts],
    );

    const validAccounts = accountResult.rows;

    if (validAccounts.length !== accounts.length) {
      return Response.json(
        {
          error: "One or more accounts are invalid",
        },
        {
          status: 400,
        },
      );
    }

    const result = {
      created: 0,
      failed: 0,
      errors: [] as {
        row: number;
        error: string;
      }[],
    };

    /*
      Process rows
    */
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      try {
        await client.query("BEGIN");

        /*
          Validate content
        */
        if (!row.content?.trim()) {
          throw new Error("Missing content");
        }

        /*
          Validate date
        */
        if (!row.schedule_time) {
          throw new Error("Missing schedule time");
        }

        const date = new Date(row.schedule_time);

        if (isNaN(date.getTime())) {
          throw new Error("Invalid schedule time");
        }

        /*
          Create post
        */
        const postResult = await client.query(
          `
            INSERT INTO posts
            (
              user_id,
              post,
              image_url,
              schedule_time,
              created_at,
              updated_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              NOW(),
              NOW()
            )
            RETURNING id
            `,
          [userId, row.content, row.image_url || null, row.schedule_time],
        );

        const postId = postResult.rows[0].id;

        /*
          Create targets
        */
        for (const account of validAccounts) {
          await client.query(
            `
            INSERT INTO post_targets
            (
              post_id,
              social_account_id,
              platform,
              status,
              retry_count,
              created_at,
              updated_at
            )
            VALUES
            (
              $1,
              $2,
              $3,
              'scheduled',
              0,
              NOW(),
              NOW()
            )
            `,
            [postId, account.id, account.platform],
          );
        }

        await client.query("COMMIT");

        /*
          Event
        */
        await createEvent("BULK_POST_CREATED", "post", postId, userId, {
          source: "bulk_upload",
          targets: validAccounts.length,
        });

        result.created++;
      } catch (error) {
        await client.query("ROLLBACK");

        result.failed++;

        result.errors.push({
          row: rowIndex + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json(result);
  } finally {
    client.release();
  }
}
