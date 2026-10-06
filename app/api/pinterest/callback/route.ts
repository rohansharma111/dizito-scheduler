import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";

import { exchangeToken } from "@/lib/platforms/pinterest/exchangeToken";
import { getProfile } from "@/lib/platforms/pinterest/getProfile";
import { getBoards } from "@/lib/platforms/pinterest/getBoards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return Response.json(
      {
        error: `Pinterest OAuth Error: ${error}`,
      },
      {
        status: 401,
      },
    );
  }

  if (!code) {
    return Response.json(
      {
        error: "Authorization code missing",
      },
      {
        status: 400,
      },
    );
  }

  const cookieStore = await cookies();

  const storedState = cookieStore.get("pinterest_oauth_state")?.value;

  if (!storedState) {
    return Response.json(
      {
        error: "OAuth state cookie missing",
      },
      {
        status: 401,
      },
    );
  }

  if (storedState !== state) {
    return Response.json(
      {
        error: "Invalid OAuth state",
      },
      {
        status: 401,
      },
    );
  }

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

  const reconnectAccountId =
    cookieStore.get("pinterest_oauth_reconnect")?.value || null;
  const reconnectType =
    cookieStore.get("pinterest_oauth_reconnect_type")?.value || "account";
  const isReconnect = Boolean(reconnectAccountId);

  try {
    /*
      Exchange authorization code
    */
    const token = await exchangeToken(code);

    /*
      Get Pinterest profile
    */
    const profile = await getProfile(token.accessToken);

    /*
      Get Pinterest boards
    */
    const boards = await getBoards(token.accessToken);

    if (isReconnect) {
      const accountResult = await pool.query(
        `
        SELECT id, account_name, board_id
        FROM social_accounts
        WHERE id = $1 AND user_id = $2 AND platform = 'pinterest'
        `,
        [reconnectAccountId, userId],
      );

      const account = accountResult.rows[0];

      if (!account) {
        throw new Error("Pinterest reconnect account not found");
      }

      const board = boards.find((item: any) => item.id === account.board_id);

      if (!board) {
        throw new Error("Pinterest reconnect board is no longer available");
      }

      await pool.query(
        `
        UPDATE social_accounts
        SET
          access_token = $1,
          status = 'connected',
          health_status = 'healthy',
          last_checked_at = NOW(),
          updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        `,
        [token.accessToken, account.id, userId],
      );

      await createEvent(
        "ACCOUNT_RECONNECTED",
        "social_account",
        account.id,
        userId,
        {
          platform: "pinterest",
          reconnectType,
          boardId: account.board_id,
        },
      );

      if (reconnectType === "recover") {
        try {
          await fetch(
            process.env.NEXTAUTH_URL + "/api/post-targets/recover-auth",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                socialAccountId: account.id,
              }),
            },
          );
        } catch (error) {
          console.error("Pinterest recover auth failed", error);
        }
      }

      cookieStore.delete("pinterest_oauth_state");
      cookieStore.delete("pinterest_oauth_reconnect");
      cookieStore.delete("pinterest_oauth_reconnect_type");

      return Response.redirect(
        process.env.NEXTAUTH_URL + "/accounts?reconnected=true",
      );
    }
    /*
      Remove previous temporary OAuth session
      (same behaviour as Meta)
    */
    await pool.query(
      `
      DELETE
      FROM oauth_page_selections
      WHERE user_id = $1
      `,
      [userId],
    );

    /*
      Store temporary OAuth session
    */
    await pool.query(
      `
      INSERT INTO oauth_page_selections
      (
        user_id,
        access_token,
        pages,
        reconnect_account_id,
        reconnect_type,
        created_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        NULL,
        NULL,
        NOW()
      )
      `,
      [
        userId,
        token.accessToken,
        JSON.stringify({
          profile,
          boards,
        }),
      ],
    );

    /*
      Cleanup state cookie
    */
    cookieStore.delete("pinterest_oauth_state");

    /*
      Redirect to board selection
    */
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/select/pinterest`,
    );
  } catch (error) {
    console.error("Pinterest callback failed", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pinterest authentication failed",
      },
      {
        status: 500,
      },
    );
  }
}
