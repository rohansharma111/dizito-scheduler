import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

type BulkRow = {
  content: string;
  schedule_time: string;
  image_url?: string;
  accounts: number[];
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

  if (!Array.isArray(rows)) {
    return Response.json(
      {
        error: "Invalid payload",
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

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /*
        Validate
      */

      if (!row.content?.trim()) {
        throw new Error("Missing content");
      }

      if (!row.schedule_time) {
        throw new Error("Missing schedule time");
      }

      if (!row.accounts || row.accounts.length === 0) {
        throw new Error("No accounts selected");
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
          RETURNING *
          `,
        [userId, row.content, row.image_url || null, row.schedule_time],
      );

      const post = postResult.rows[0];

      /*
        Create targets
      */

      for (const accountId of row.accounts) {
        const accountResult = await client.query(
          `
            SELECT
              id,
              platform,
              account_name
            FROM social_accounts
            WHERE
              id = $1
              AND user_id = $2
            `,
          [accountId, userId],
        );

        const account = accountResult.rows[0];

        if (!account) {
          throw new Error(`Account ${accountId} not found`);
        }

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
          [post.id, account.id, account.platform],
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
    } finally {
      client.release();
    }
  }

  return Response.json(result);
}
