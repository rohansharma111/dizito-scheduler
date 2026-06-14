import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  const state = searchParams.get("state");

  if (!code) {
    return Response.json(
      {
        error: "No code",
      },
      {
        status: 400,
      },
    );
  }

  const tokenResponse = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI!)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`,
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.json(tokenData, {
      status: 400,
    });
  }

  // RECONNECT FLOW
  if (state?.startsWith("reconnect:")) {
    const accountId = state.split(":")[1];

    const existing = await pool.query(
      `
        SELECT *
        FROM social_accounts
        WHERE
          id = $1
          AND user_id = $2
        `,
      [accountId, (session.user as any).id],
    );

    if (existing.rows.length === 0) {
      return Response.json(
        {
          error: "Account not found",
        },
        {
          status: 404,
        },
      );
    }

    await pool.query(
      `
  UPDATE social_accounts
  SET
    access_token = $1,
    status = 'connected',
    last_checked_at = NOW()
  WHERE
    id = $2
    AND user_id = $3
  `,
      [accessToken, accountId, (session.user as any).id],
    );

    return Response.redirect(
      "https://dizito-scheduler-production.up.railway.app/accounts",
    );
  }

  // NORMAL CONNECT FLOW

  const pagesResponse = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`,
  );

  const pagesData = await pagesResponse.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    return Response.json(
      {
        error: "No Facebook Pages found",
      },
      {
        status: 400,
      },
    );
  }

  await pool.query(
    `
    INSERT INTO oauth_page_selections
    (
      user_id,
      access_token,
      pages
    )
    VALUES
    (
      $1,
      $2,
      $3
    )
    `,
    [(session.user as any).id, accessToken, JSON.stringify(pagesData.data)],
  );

  return Response.redirect(
    "https://dizito-scheduler-production.up.railway.app/accounts/select",
  );
}
