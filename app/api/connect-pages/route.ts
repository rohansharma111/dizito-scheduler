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

  const connectedAccountsCount = Number(connectedAccountsResult.rows[0].count);

  if (connectedAccountsCount >= userPlan.accounts) {
    return Response.json(
      {
        error: `Your ${userPlan.name} plan allows only ${userPlan.accounts} connected account(s). Please upgrade your plan.`,
      },
      {
        status: 403,
      },
    );
  }

  let accountCount = connectedAccountsCount;

  const body = await request.json();

  const selectedPages = body.selectedPages;

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

  const oauthData = selectionResult.rows[0];

  const reconnectAccountId = oauthData.reconnect_account_id;

  const reconnectType = oauthData.reconnect_type;

  const isReconnect = !!reconnectAccountId;

  let reconnectAccount = null;

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

    for (const selectedId of selectedPages) {
      const page = pages.find((p: any) => p.id === selectedId);

      if (!page) {
        continue;
      }

      /*
  FACEBOOK
*/

      /*
   RECONNECT
*/
      if (isReconnect && reconnectAccount.platform === "facebook") {
        await pool.query(
          `
    UPDATE social_accounts
    SET
      account_name = $1,
      access_token = $2,
      page_access_token = $3,
      page_id = $4,
      status = 'connected',
      last_checked_at = NOW()
    WHERE
      id = $5
      AND user_id = $6
    `,
          [
            page.name,
            accessToken,
            page.access_token,
            page.id,
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
            pageId: page.id,
          },
        );

        connectedAccounts.push(`${page.name} (Facebook Reconnected)`);

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
      page_id,
      user_id,
      page_access_token
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6
    )
    RETURNING id
    `,
          [
            "facebook",
            page.name,
            accessToken,
            page.id,
            userId,
            page.access_token,
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

      /*
        INSTAGRAM
      */
      const instagramResponse = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      );

      const instagramData = await instagramResponse.json();

      const instagramId = instagramData?.instagram_business_account?.id;

      /*
  INSTAGRAM RECONNECT
*/
      if (isReconnect && reconnectAccount.platform === "instagram") {
        await pool.query(
          `
    UPDATE social_accounts
    SET
      account_name = $1,
      access_token = $2,
      page_access_token = $3,
      page_id = $4,
      instagram_business_id = $5,
      status = 'connected',
      last_checked_at = NOW()
    WHERE
      id = $6
      AND user_id = $7
    `,
          [
            page.name,
            accessToken,
            page.access_token,
            page.id,
            instagramId,
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
            instagramBusinessId: instagramId,
          },
        );

        connectedAccounts.push(`${page.name} (Instagram Reconnected)`);

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
              page_id,
              instagram_business_id,
              user_id,
              page_access_token
            )
            VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )
            RETURNING id
            `,
          [
            "instagram",
            page.name,
            accessToken,
            page.id,
            instagramId,
            userId,
            page.access_token,
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
          : "/accounts?reconnected=true",

      message:
        reconnectType === "recover"
          ? "Publishing recovered"
          : `${connectedAccounts.length} account(s) connected`,
    });
  } catch (error) {
    await pool.query("ROLLBACK");

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
