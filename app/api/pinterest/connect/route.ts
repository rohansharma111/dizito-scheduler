import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { getPlan } from "@/lib/plans";

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

  /*
      User plan
  */
  const userResult = await pool.query(
    `
    SELECT plan
    FROM users
    WHERE id = $1
    `,
    [userId],
  );

  const plan = userResult.rows[0]?.plan ?? "free";

  const userPlan = getPlan(plan);

  /*
      Current connected account count
  */
  const connectedAccountsResult = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM social_accounts
    WHERE user_id = $1
    `,
    [userId],
  );

  let accountCount = Number(connectedAccountsResult.rows[0].count);

  const body = await request.json();

  const selectedBoards = body.boards;

  if (!selectedBoards || selectedBoards.length === 0) {
    return Response.json(
      {
        error: "No boards selected",
      },
      {
        status: 400,
      },
    );
  }

  /*
      Temporary OAuth session
  */
  const selectionResult = await pool.query(
    `
    SELECT *
    FROM oauth_page_selections
    WHERE
      user_id = $1
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId],
  );

  if (selectionResult.rows.length === 0) {
    return Response.json(
      {
        error: "Pinterest OAuth session not found",
      },
      {
        status: 400,
      },
    );
  }

  const oauthData = selectionResult.rows[0];

  const reconnectAccountId = oauthData.reconnect_account_id;

  const reconnectType = oauthData.reconnect_type;

  const isReconnect = !!reconnectAccountId;

  let reconnectAccount = null;

  if (isReconnect && selectedBoards.length > 1) {
    return Response.json(
      {
        error: "Reconnect only supports one board.",
      },
      {
        status: 400,
      },
    );
  }

  if (isReconnect) {
    const reconnectResult = await pool.query(
      `
        SELECT *
        FROM social_accounts
        WHERE
          id = $1
          AND user_id = $2
        `,
      [reconnectAccountId, userId],
    );

    reconnectAccount = reconnectResult.rows[0];

    if (!reconnectAccount) {
      return Response.json(
        {
          error: "Reconnect account not found",
        },
        {
          status: 404,
        },
      );
    }
  }

  const oauthPayload =
    typeof oauthData.pages === "string"
      ? JSON.parse(oauthData.pages)
      : oauthData.pages;

  const boards = oauthPayload.boards ?? [];

  const profile = oauthPayload.profile;

  const accessToken = oauthData.access_token;

  const connectedAccounts: string[] = [];

  try {
    await pool.query("BEGIN");

    /*
        Reconnect validation
    */
    if (isReconnect) {
      const selected = selectedBoards[0];

      if (selected.boardId !== reconnectAccount.board_id) {
        throw new Error("INVALID_RECONNECT_BOARD");
      }
      if (reconnectAccount.platform !== "pinterest") {
        throw new Error("INVALID_RECONNECT_PLATFORM");
      }
    }
    /*
        Connect boards
    */
    for (const selection of selectedBoards) {
      const board = boards.find((b: any) => b.id === selection.boardId);

      if (!board) {
        continue;
      }

      /*
          RECONNECT
      */
      if (isReconnect) {
        await pool.query(
          `
          UPDATE social_accounts
          SET
            account_name = $1,
            access_token = $2,
            refresh_token = COALESCE($3, refresh_token),
            token_expires_at = CASE
              WHEN $4 IS NULL THEN token_expires_at
              ELSE NOW() + ($4 * INTERVAL '1 second')
            END,
            status = 'connected',
            last_checked_at = NOW(),
            updated_at = NOW()
          WHERE
            id = $3
            AND user_id = $4
          `,
          [
            reconnectAccount.account_name,
            accessToken,
            oauthData.refresh_token ?? null,
            oauthData.expires_in ?? null,
            reconnectAccountId,
            userId,
          ],
        );

        await createEvent(
          "ACCOUNT_RECONNECTED",
          "social_account",
          reconnectAccountId,
          userId,
          {
            platform: "pinterest",
            reconnectType,
            boardId: reconnectAccount.board_id,
          },
        );

        connectedAccounts.push(
          `${reconnectAccount.account_name} (Pinterest Reconnected)`,
        );

        if (reconnectType === "recover") {
          try {
            await fetch(
              `${process.env.NEXTAUTH_URL}/api/post-targets/recover-auth`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  socialAccountId: reconnectAccountId,
                }),
              },
            );
          } catch (error) {
            console.error("Recover auth failed", error);
          }
        }

        continue;
      }

      /*
          Duplicate protection
      */
      const existingPinterest = await pool.query(
        `
          SELECT id
          FROM social_accounts
          WHERE
            board_id = $1
            AND platform = 'pinterest'
            AND user_id = $2
          `,
        [board.id, userId],
      );

      if (existingPinterest.rows.length > 0) {
        await createEvent(
          "ACCOUNT_CONNECTION_SKIPPED",
          "social_account",
          existingPinterest.rows[0].id,
          userId,
          {
            platform: "pinterest",
            reason: "duplicate",
          },
        );

        continue;
      }

      /*
          Plan limit
      */
      if (accountCount >= userPlan.accounts) {
        throw new Error(`PLAN_LIMIT:${userPlan.accounts}`);
      }

      /*
          Insert account
      */
      const pinterest = await pool.query(
        `
          INSERT INTO social_accounts
          (
            platform,
            account_name,
            access_token,
            refresh_token,
            token_expires_at,
            board_id,
    pinterest_profile_id,
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
            $7,
            $8
          )
          RETURNING id
          `,
        [
          "pinterest",
          board.name,
          accessToken,
          oauthData.refresh_token ?? null,
          oauthData.expires_in
            ? new Date(Date.now() + Number(oauthData.expires_in) * 1000)
            : null,
          board.id,
          profile?.id,
          userId,
        ],
      );

      accountCount++;

      await createEvent(
        "ACCOUNT_CONNECTED",
        "social_account",
        pinterest.rows[0].id,
        userId,
        {
          platform: "pinterest",
          accountName: board.name,
          boardId: board.id,
          profileId: profile?.id,
        },
      );

      connectedAccounts.push(`${board.name} (Pinterest)`);
    }
    /*
        Cleanup OAuth session
    */
    await pool.query(
      `
      DELETE
      FROM oauth_page_selections
      WHERE
        user_id = $1
      `,
      [userId],
    );

    await pool.query("COMMIT");

    return Response.json({
      success: true,

      total: connectedAccounts.length,

      connectedAccounts,

      redirect:
        reconnectType === "recover"
          ? "/dashboard?recovered=true"
          : isReconnect
            ? "/accounts?reconnected=true"
            : "/accounts?connected=true",

      message:
        reconnectType === "recover"
          ? "Pinterest publishing recovered"
          : `${connectedAccounts.length} Pinterest board(s) connected`,
    });
  } catch (error) {
    await pool.query("ROLLBACK");

    if (error instanceof Error && error.message === "INVALID_RECONNECT_BOARD") {
      return Response.json(
        {
          error: "Please reconnect the same Pinterest board.",
        },
        {
          status: 400,
        },
      );
    }

    console.error(error);

    if (error instanceof Error && error.message.startsWith("PLAN_LIMIT:")) {
      return Response.json(
        {
          error: `Your ${userPlan.name} plan allows only ${userPlan.accounts} connected account(s). Please upgrade your plan.`,
        },
        {
          status: 403,
        },
      );
    }

    return Response.json(
      {
        error: "Failed to connect Pinterest boards",
      },
      {
        status: 500,
      },
    );
  }
}
