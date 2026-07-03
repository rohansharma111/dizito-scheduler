import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { canConnectAccount } from "@/lib/plans";
import { createEvent } from "@/lib/events";

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

  const userId = (session.user as any).id;

  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  const state = searchParams.get("state");

  const isReconnect = state?.startsWith("reconnect:");

  const error = searchParams.get("error");

  const errorReason = searchParams.get("error_reason");

  if (error) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts?error=oauth_cancelled`,
    );
  }

  /*
    PLAN CHECK
    ONLY FOR NEW CONNECTIONS
  */
  if (!isReconnect) {
    const userResult = await pool.query(
      `
        SELECT plan
        FROM users
        WHERE id = $1
        `,
      [userId],
    );

    const userPlan = userResult.rows[0]?.plan ?? "free";

    const accountResult = await pool.query(
      `
        SELECT COUNT(*)
        FROM social_accounts
        WHERE user_id = $1
        `,
      [userId],
    );

    const accountCount = Number(accountResult.rows[0].count);

    if (!canConnectAccount(userPlan, accountCount)) {
      return Response.json(
        {
          error: "Your plan account limit has been reached. Please upgrade.",
        },
        {
          status: 403,
        },
      );
    }
  }

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

  /*
    EXCHANGE CODE
  */
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(
      process.env.META_REDIRECT_URI!,
    )}&client_secret=${process.env.META_APP_SECRET}&code=${code}`,
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.json(tokenData, {
      status: 400,
    });
  }

  /*
    GET PAGES
  */
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

  /*
    STRICT RECONNECT
  */
  if (isReconnect) {
    const parts = state!.split(":");

    const reconnectAccountId = Number(parts[1]);

    const existingAccountResult = await pool.query(
      `
        SELECT *
        FROM social_accounts
        WHERE
          id = $1
          AND user_id = $2
        `,
      [reconnectAccountId, userId],
    );

    const existingAccount = existingAccountResult.rows[0];

    if (!existingAccount) {
      return Response.json(
        {
          error: "Account not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
      FACEBOOK
    */
    if (existingAccount.platform === "facebook") {
      const matchingPage = pagesData.data.find(
        (page: any) => page.id === existingAccount.page_id,
      );

      if (!matchingPage) {
        return Response.json(
          {
            error:
              "This Facebook page does not match the original connected account. Disconnect the account and connect a new one.",
          },
          {
            status: 400,
          },
        );
      }

      await pool.query(
        `
        UPDATE social_accounts
        SET
          access_token = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [accessToken, existingAccount.id],
      );

      await createEvent(
        "ACCOUNT_RECONNECTED",
        "social_account",
        existingAccount.id,
        userId,
        {
          platform: "facebook",
          account: existingAccount.account_name,
        },
      );

      return Response.redirect(
        `${process.env.NEXTAUTH_URL}/accounts?reconnected=true`,
      );
    }

    /*
  INSTAGRAM STRICT RECONNECT
*/
    if (existingAccount.platform === "instagram") {
      let foundInstagram = false;

      for (const page of pagesData.data) {
        const instagramResponse = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`,
        );

        const instagramData = await instagramResponse.json();

        const instagramId = instagramData?.instagram_business_account?.id;

        if (
          instagramId &&
          instagramId === existingAccount.instagram_business_id
        ) {
          foundInstagram = true;

          /*
        Update existing account
      */
          await pool.query(
            `
        UPDATE social_accounts
        SET
          access_token = $1,
          page_id = $2,
          updated_at = NOW()
        WHERE id = $3
        `,
            [accessToken, page.id, existingAccount.id],
          );

          await createEvent(
            "ACCOUNT_RECONNECTED",
            "social_account",
            existingAccount.id,
            userId,
            {
              platform: "instagram",

              account: existingAccount.account_name,

              pageId: page.id,

              instagramBusinessId: instagramId,
            },
          );

          return Response.redirect(
            `${process.env.NEXTAUTH_URL}/accounts?reconnected=true`,
          );
        }
      }

      if (!foundInstagram) {
        return Response.json(
          {
            error:
              "This Instagram account does not match the original connected account. Disconnect the account and connect a new one.",
          },
          {
            status: 400,
          },
        );
      }
    }
  }

  const enrichedPages = [];

  for (const page of pagesData.data) {
    const instagramResponse = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`,
    );

    const instagramData = await instagramResponse.json();

    enrichedPages.push({
      id: page.id,

      name: page.name,

      access_token: page.access_token,

      // frontend
      pageId: page.id,
      pageName: page.name,

      hasFacebook: true,

      hasInstagram: !!instagramData?.instagram_business_account,

      instagramBusinessId:
        instagramData?.instagram_business_account?.id || null,
    });
  }

  /*
    NEW CONNECTION
  */

  await pool.query(
    `
    INSERT INTO oauth_page_selections
    (
      user_id,
      access_token,
      pages,
      created_at
    )
    VALUES
    (
      $1,
      $2,
      $3,
      NOW()
    )
    `,
    [userId, accessToken, JSON.stringify(enrichedPages)],
  );

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts/select`);
}
