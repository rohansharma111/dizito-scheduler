import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

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
      new URL("/accounts/select/pinterest", request.url),
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
