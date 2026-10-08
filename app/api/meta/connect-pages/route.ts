import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { getPlan } from "@/lib/plans";
import { encryptSocialCredential } from "@/lib/security/social-credentials";
import { resolveOAuthSelectionCredentials } from "@/lib/security/social-oauth-selection";

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
    Current account count
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

  const selectedPages = body.pages;

  if (!selectedPages || selectedPages.length === 0) {
    return Response.json(
      {
        error: "No pages selected",
      },
      {
        status: 400,
      },
    );
  }

  const selectionResult = await pool.query(
    `
      SELECT *
      FROM oauth_page_selections
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
    [userId],
  );

  if (selectionResult.rows.length === 0) {
    return Response.json(
      {
        error: "OAuth session not found",
      },
      {
        status: 400,
      },
    );
  }

  const oauthData = resolveOAuthSelectionCredentials(selectionResult.rows[0]);

  const reconnectAccountId = oauthData.reconnect_account_id;

  const reconnectType = oauthData.reconnect_type;

  let reconnectAccount = null;

  const isReconnect = !!reconnectAccountId;

  if (isReconnect && selectedPages.length > 1) {
    return Response.json(
      {
        error: "Reconnect only supports one account.",
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

  const pages = oauthData.pages;

  const accessToken = oauthData.access_token;

  const connectedAccounts: string[] = [];

  try {
    await pool.query("BEGIN");

    if (isReconnect) {
      const selected = selectedPages[0];

      if (selected.pageId !== reconnectAccount.page_id) {
        throw new Error("INVALID_RECONNECT_PAGE");
      }

      if (reconnectAccount.platform === "facebook") {
        if (!selected.facebook) throw new Error("INVALID_RECONNECT_PLATFORM");

        if (selected.instagram) throw new Error("INVALID_RECONNECT_PLATFORM");
      }

      if (reconnectAccount.platform === "instagram") {
        if (!selected.instagram) throw new Error("INVALID_RECONNECT_PLATFORM");

        if (selected.facebook) throw new Error("INVALID_RECONNECT_PLATFORM");
      }
    }

    for (const selection of selectedPages) {
      const page = pages.find((p: any) => p.pageId === selection.pageId);

      if (!page) {
        continue;
      }

      const connectFacebook = selection.facebook;

      const connectInstagram = selection.instagram;

      /*
  FACEBOOK
*/

      /*
   RECONNECT
*/
      if (
        connectFacebook &&
        isReconnect &&
        reconnectAccount.platform === "facebook"
      ) {
        await pool.query(
          `
    UPDATE social_accounts
    SET
      account_name = $1,
      access_token = NULL,
      access_token_encrypted = $2,
      page_access_token = NULL,
      page_access_token_encrypted = $3,
      credential_encryption_version = 'v1',
      status = 'connected',
      last_checked_at = NOW()
    WHERE
      id = $4
      AND user_id = $5
    `,
          [
            reconnectAccount.account_name,
            encryptSocialCredential(accessToken),
            encryptSocialCredential(page.access_token),
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
            platform: "facebook",
            reconnectType,
            pageId: reconnectAccount.page_id,
          },
        );

        connectedAccounts.push(
          `${reconnectAccount.account_name} (Facebook Reconnected)`,
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

      if (connectFacebook) {
        const existingFacebook = await pool.query(
          `
  SELECT id
  FROM social_accounts
  WHERE
    page_id = $1
    AND platform='facebook'
    AND user_id=$2
  `,
          [page.id, userId],
        );

        if (existingFacebook.rows.length === 0) {
          if (accountCount >= userPlan.accounts) {
            throw new Error(`PLAN_LIMIT:${userPlan.accounts}`);
          }

          const facebook = await pool.query(
            `
    INSERT INTO social_accounts
    (
      platform,
      account_name,
      access_token,
      access_token_encrypted,
      page_id,
      user_id,
      page_access_token,
      page_access_token_encrypted,
      credential_encryption_version
    )
    VALUES
    (
      $1,
      $2,
      NULL,
      $3,
      $4,
      $5,
      NULL,
      $6,
      'v1'
    )
    RETURNING id
    `,
            [
              "facebook",
              page.name,
              encryptSocialCredential(accessToken),
              page.id,
              userId,
              encryptSocialCredential(page.access_token),
            ],
          );

          accountCount++;

          await createEvent(
            "ACCOUNT_CONNECTED",
            "social_account",
            facebook.rows[0].id,
            userId,
            {
              platform: "facebook",
              accountName: page.name,
              pageId: page.id,
            },
          );

          connectedAccounts.push(`${page.name} (Facebook)`);
        } else {
          await createEvent(
            "ACCOUNT_CONNECTION_SKIPPED",
            "social_account",
            existingFacebook.rows[0].id,
            userId,
            {
              platform: "facebook",
              reason: "duplicate",
            },
          );
        }
      }

      /*
  INSTAGRAM RECONNECT
*/
      if (
        connectInstagram &&
        isReconnect &&
        reconnectAccount.platform === "instagram"
      ) {
        await pool.query(
          `
    UPDATE social_accounts
    SET
      account_name = $1,
      access_token = NULL,
      access_token_encrypted = $2,
      page_access_token = NULL,
      page_access_token_encrypted = $3,
      credential_encryption_version = 'v1',
      status = 'connected',
      last_checked_at = NOW()
    WHERE
      id = $4
      AND user_id = $5
    `,
          [
            reconnectAccount.account_name,
            encryptSocialCredential(accessToken),
            encryptSocialCredential(page.access_token),
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
            platform: "instagram",
            reconnectType,
            instagramBusinessId: reconnectAccount.instagram_business_id,
          },
        );

        connectedAccounts.push(
          `${reconnectAccount.account_name} (Instagram Reconnected)`,
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
        INSTAGRAM
      */
      if (connectInstagram) {
        const instagramResponse = await fetch(
          `https://graph.facebook.com/v26.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        );

        const instagramData = await instagramResponse.json();

        const instagramId = instagramData?.instagram_business_account?.id;

        if (!instagramId) {
          console.log("No Instagram account linked:", page.name);

          continue;
        }

        const existingInstagram = await pool.query(
          `
          SELECT id
          FROM social_accounts
          WHERE
            instagram_business_id = $1
            AND platform = 'instagram'
            AND user_id = $2
          `,
          [instagramId, userId],
        );

        if (existingInstagram.rows.length === 0) {
          if (accountCount >= userPlan.accounts) {
            throw new Error(`PLAN_LIMIT:${userPlan.accounts}`);
          }

          const instagram = await pool.query(
            `
            INSERT INTO social_accounts
            (
              platform,
              account_name,
              access_token,
              access_token_encrypted,
              page_id,
              instagram_business_id,
              user_id,
              page_access_token,
              page_access_token_encrypted,
              credential_encryption_version
            )
            VALUES
            (
              $1,
              $2,
              NULL,
              $3,
              $4,
              $5,
              $6,
              NULL,
              $7,
              'v1'
            )
            RETURNING id
            `,
            [
              "instagram",
              page.name,
              encryptSocialCredential(accessToken),
              page.id,
              instagramId,
              userId,
              encryptSocialCredential(page.access_token),
            ],
          );

          accountCount++;

          await createEvent(
            "ACCOUNT_CONNECTED",
            "social_account",
            instagram.rows[0].id,
            userId,
            {
              platform: "instagram",
              accountName: page.name,
              instagramBusinessId: instagramId,
            },
          );

          connectedAccounts.push(`${page.name} (Instagram)`);
        } else {
          await createEvent(
            "ACCOUNT_CONNECTION_SKIPPED",
            "social_account",
            existingInstagram.rows[0].id,
            userId,
            {
              platform: "instagram",
              reason: "duplicate",
            },
          );
        }
      }
    }
    /*
      Cleanup OAuth cache
    */
    await pool.query(
      `
      DELETE
      FROM oauth_page_selections
      WHERE user_id = $1
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
          ? "Publishing recovered"
          : `${connectedAccounts.length} account(s) connected`,
    });
  } catch (error) {
    await pool.query("ROLLBACK");

    if (error instanceof Error && error.message === "INVALID_RECONNECT_PAGE") {
      return Response.json(
        {
          error: "Please reconnect the same account.",
        },
        {
          status: 400,
        },
      );
    }
    if (
      error instanceof Error &&
      error.message === "INVALID_RECONNECT_PLATFORM"
    ) {
      return Response.json(
        {
          error: "Please reconnect the same platform.",
        },
        {
          status: 400,
        },
      );
    }
    if (error instanceof Error && error.message === "NO_PLATFORM_SELECTED") {
      return Response.json(
        {
          error: "Please select at least one platform.",
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
        error: "Failed to connect accounts",
      },
      {
        status: 500,
      },
    );
  }
}
