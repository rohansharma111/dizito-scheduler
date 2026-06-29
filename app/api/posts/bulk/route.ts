import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

type BulkRow = {
  content: string;
  schedule_time: string;
  image_url?: string;
};

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

  const client = await pool.connect();

  try {
    /*
      Validate selected accounts once
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
          Validate row
        */
        if (!row.content?.trim()) {
          throw new Error("Missing content");
        }

        if (!row.schedule_time) {
          throw new Error("Missing schedule time");
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
