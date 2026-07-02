import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlan, canConnectAccount } from "@/lib/plans";

export async function GET(request: Request) {
  try {
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

    /*
      PLAN CHECK
      Skip reconnects
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

      const userPlan = userResult.rows[0]?.plan || "free";

      const currentPlan = getPlan(userPlan);

      const connectedAccounts = await pool.query(
        `
          SELECT COUNT(*)
          FROM social_accounts
          WHERE
            user_id = $1
            AND account_status != 'deleted'
          `,
        [userId],
      );

      const currentAccounts = Number(connectedAccounts.rows[0].count);

      if (!canConnectAccount(userPlan, currentAccounts)) {
        await createEvent(
          "ACCOUNT_CONNECTION_BLOCKED",
          "user",
          userId,
          userId,
          {
            platform: "linkedin",

            plan: userPlan,

            currentAccounts,

            maxAccounts: currentPlan.accounts,
          },
        );

        return Response.json(
          {
            error: `Your ${currentPlan.name} plan allows only ${currentPlan.accounts} connected account(s). Please upgrade your plan.`,
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
          error: "No authorization code",
        },
        {
          status: 400,
        },
      );
    }

    /*
      Exchange code
    */
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          grant_type: "authorization_code",

          code,

          redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,

          client_id: process.env.LINKEDIN_CLIENT_ID!,

          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("LINKEDIN TOKEN ERROR", tokenData);

      return Response.json(tokenData, {
        status: 400,
      });
    }

    /*
      Fetch profile
    */
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const profileData = await profileResponse.json();

    const memberId = profileData.sub;

    const accountName = profileData.name || profileData.email || "LinkedIn";

    if (!memberId) {
      return Response.json(
        {
          error: "LinkedIn member id not found",

          profileData,
        },
        {
          status: 400,
        },
      );
    }

    /*
      RECONNECT FLOW
    */
    if (isReconnect) {
      const parts = state!.split(":");

      const accountId = parts[1];

      const reconnectType = parts[2] ?? "account";

      const existing = await pool.query(
        `
          SELECT *
          FROM social_accounts
          WHERE
            id = $1
            AND user_id = $2
          `,
        [accountId, userId],
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

      /*
        Update token
      */
      await pool.query(
        `
        UPDATE social_accounts
        SET
          access_token = $1,
          account_status = 'active',
          last_checked_at = NOW()
        WHERE
          id = $2
          AND user_id = $3
        `,
        [accessToken, accountId, userId],
      );

      /*
        Recover auth failures
      */
      if (reconnectType === "recover") {
        try {
          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/post-targets/recover-auth`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                socialAccountId: accountId,
              }),
            },
          );

          if (!response.ok) {
            console.error("Recover auth failed", await response.text());
          }
        } catch (error) {
          console.error("Recover auth crashed", error);
        }
      }

      return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts`);
    }

    /*
      DUPLICATE CHECK
    */
    const existing = await pool.query(
      `
        SELECT id
        FROM social_accounts
        WHERE
          platform='linkedin'
          AND linkedin_member_id=$1
          AND user_id=$2
        `,
      [memberId, userId],
    );

    if (existing.rows.length > 0) {
      await createEvent(
        "ACCOUNT_ALREADY_CONNECTED",
        "social_account",
        existing.rows[0].id,
        userId,
        {
          platform: "linkedin",

          memberId,
        },
      );

      return Response.redirect(new URL("/accounts", request.url));
    }

    /*
      CREATE ACCOUNT
    */
    const result = await pool.query(
      `
        INSERT INTO social_accounts
        (
          platform,
          account_name,
          access_token,
          linkedin_member_id,
          user_id,
          account_status,
          last_checked_at
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          NOW()
        )
        RETURNING id
        `,
      ["linkedin", accountName, accessToken, memberId, userId, "active"],
    );

    const accountId = result.rows[0].id;

    await createEvent(
      "ACCOUNT_CONNECTED",
      "social_account",
      accountId,
      userId,
      {
        platform: "linkedin",

        accountName,

        memberId,

        plan: !isReconnect
          ? (await pool.query("SELECT plan FROM users WHERE id=$1", [userId]))
              .rows[0]?.plan
          : undefined,
      },
    );

    return Response.redirect(new URL("/accounts", request.url));
  } catch (error) {
    console.error("LINKEDIN CALLBACK ERROR", error);

    return Response.json(
      {
        error: String(error),
      },
      {
        status: 500,
      },
    );
  }
}
