import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { verifyOAuthState } from "@/lib/security/oauth-state";
import { canConnectAccount } from "@/lib/plans";
import { createEvent } from "@/lib/events";
import { encryptSocialCredential } from "@/lib/security/social-credentials";
import {
  discoverMetaPages,
  getInstagramBusinessAccount,
  metaGraphGet,
  metaGraphUrl,
} from "@/lib/meta/api";

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
  const providedState = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  const reconnect = cookieStore.get("meta_oauth_reconnect")?.value || null;
  const reconnectType = cookieStore.get("meta_oauth_reconnect_type")?.value || null;

  if (!verifyOAuthState(expectedState, providedState)) {
    return Response.json({ error: "Invalid OAuth state" }, { status: 401 });
  }

  cookieStore.delete("meta_oauth_state");
  cookieStore.delete("meta_oauth_reconnect");
  cookieStore.delete("meta_oauth_reconnect_type");

  const state = reconnect && reconnectType
    ? `reconnect:${reconnect}:${reconnectType}`
    : "connect";

  const isReconnect = state.startsWith("reconnect:");

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
    (() => {
      const url = new URL(metaGraphUrl("/oauth/access_token"));
      url.searchParams.set("client_id", process.env.META_APP_ID!);
      url.searchParams.set(
        "redirect_uri",
        process.env.META_REDIRECT_URI!,
      );
      url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
      url.searchParams.set("code", code);
      return url.toString();
    })(),
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error("META TOKEN EXCHANGE FAILED", {
      status: tokenResponse.status,
      error: tokenData?.error,
      error_description: tokenData?.error_description,
      error_code: tokenData?.error_code,
    });

    return Response.json(
      {
        error: "Meta token exchange failed",
      },
      {
        status: 400,
      },
    );
  }

  const permissionsResponse = await fetch(
    metaGraphUrl("/me/permissions"),
  );

  const permissionsData = await permissionsResponse.json();

  console.log(
    "META TOKEN PERMISSIONS:",
    JSON.stringify(permissionsData, null, 2),
  );

  /*
    GET PAGES

    /me/accounts remains the primary Page discovery path. Business-scoped
    users can have Pages assigned to them without those Pages appearing there,
    so discoverMetaPages() falls back to /me/assigned_pages.
  */
  let pageDiscovery;

  try {
    pageDiscovery = await discoverMetaPages(accessToken);
  } catch (error) {
    console.error("META PAGE DISCOVERY FAILED:", error);

    return Response.json(
      {
        error: "Meta API error while loading Facebook Pages",
        meta: error instanceof Error ? error.message : error,
      },
      {
        status: 400,
      },
    );
  }

  const pagesData = {
    data: pageDiscovery.pages,
  };

  console.log("META PAGE DISCOVERY SOURCE:", pageDiscovery.source);

  if (pageDiscovery.pages.length === 0) {
    return Response.json(
      {
        error:
          "No Facebook Pages were returned by Meta. If this Page is managed through a Business Portfolio, the Meta app must have the business-management access required for business-scoped Page discovery and the user must authorize that access.",
        discoverySource: pageDiscovery.source,
        accountCount: pageDiscovery.accountsResponse?.data?.length ?? 0,
        assignedPageCount: pageDiscovery.assignedPagesResponse?.data?.length ?? 0,
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
          access_token = NULL,
          access_token_encrypted = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [encryptSocialCredential(accessToken), existingAccount.id],
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
        const instagramResult = await getInstagramBusinessAccount(
          page.id,
          page.access_token || accessToken,
        );

        const instagramId = instagramResult.instagramBusinessId;

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
          access_token = NULL,
          access_token_encrypted = $1,
          page_id = $2,
          updated_at = NOW()
        WHERE id = $3
        `,
            [encryptSocialCredential(accessToken), page.id, existingAccount.id],
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
    const instagramResult = await getInstagramBusinessAccount(
      page.id,
      page.access_token || accessToken,
    );

    enrichedPages.push({
      id: page.id,

      name: page.name,

      access_token: page.access_token,

      // frontend
      pageId: page.id,
      pageName: page.name,

      hasFacebook: true,

      hasInstagram: !!instagramResult.instagramBusinessId,

      instagramBusinessId: instagramResult.instagramBusinessId,
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
      access_token_encrypted,
      pages,
      pages_encrypted,
      created_at
    )
    VALUES
    (
      $1,
      NULL,
      $2,
      NULL,
      $3,
      NOW()
    )
    `,
    [userId, encryptSocialCredential(accessToken), encryptSocialCredential(JSON.stringify(enrichedPages))],
  );

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts/select/meta`);
}
