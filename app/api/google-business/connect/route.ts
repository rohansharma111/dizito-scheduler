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
      Connected account count
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

  const selectedLocations = body.locations;

  if (!selectedLocations || selectedLocations.length === 0) {
    return Response.json(
      {
        error: "No locations selected",
      },
      {
        status: 400,
      },
    );
  }

  /*
      OAuth session
  */

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
        error: "Google Business OAuth session not found",
      },
      {
        status: 400,
      },
    );
  }

  const oauthData = resolveOAuthSelectionCredentials(selectionResult.rows[0]);

  const reconnectAccountId = oauthData.reconnect_account_id;

  const reconnectType = oauthData.reconnect_type;

  const isReconnect = !!reconnectAccountId;

  let reconnectAccount = null;

  if (isReconnect && selectedLocations.length > 1) {
    return Response.json(
      {
        error: "Reconnect only supports one location.",
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

  const profile = oauthPayload.profile;

  const locations = oauthPayload.locations ?? [];

  const accessToken = oauthData.access_token;

  const refreshToken = oauthData.refresh_token ?? null;

  const connectedAccounts: string[] = [];

  try {
    await pool.query("BEGIN");

    /*
        Reconnect validation
    */

    if (isReconnect) {
      const selected = selectedLocations[0];

      if (selected.locationId !== reconnectAccount.google_location_id) {
        throw new Error("INVALID_RECONNECT_LOCATION");
      }

      if (reconnectAccount.platform !== "google_business") {
        throw new Error("INVALID_RECONNECT_PLATFORM");
      }
    }

    /*
        Connect locations
    */

    for (const selection of selectedLocations) {
      const location = locations.find(
        (l: any) => l.id === selection.locationId,
      );

      if (!location) {
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
            access_token = NULL,
            access_token_encrypted = $2,
            refresh_token = NULL,
            refresh_token_encrypted = $3,
            status = 'connected',
            last_checked_at = NOW(),
            updated_at = NOW()
          WHERE
            id = $6
            AND user_id = $7
          `,
          [
            reconnectAccount.account_name,
            encryptSocialCredential(accessToken),
            refreshToken ? encryptSocialCredential(refreshToken) : null,
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
            platform: "google_business",
            reconnectType,
            locationId: reconnectAccount.google_location_id,
          },
        );

        connectedAccounts.push(
          `${reconnectAccount.account_name} (Google Business Reconnected)`,
        );

        /*
            Recover failed post targets
        */

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

      const existingLocation = await pool.query(
        `
          SELECT id
          FROM social_accounts
          WHERE
            google_location_id = $1
            AND platform = 'google_business'
            AND user_id = $2
          `,
        [location.id, userId],
      );

      if (existingLocation.rows.length > 0) {
        await createEvent(
          "ACCOUNT_CONNECTION_SKIPPED",
          "social_account",
          existingLocation.rows[0].id,
          userId,
          {
            platform: "google_business",
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

      const googleBusiness = await pool.query(
        `
          INSERT INTO social_accounts
          (
            platform,
            account_name,
            access_token,
            access_token_encrypted,
            refresh_token,
            refresh_token_encrypted,
            google_location_id,
            google_account_id,
            google_profile_id,
            user_id
          )
          VALUES
          (
            $1,
            $2,
            NULL,
            $3,
            NULL,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          RETURNING id
          `,
        [
          "google_business",

          location.name,

          encryptSocialCredential(accessToken),

          refreshToken ? encryptSocialCredential(refreshToken) : null,

          location.id,

          location.accountId,

          profile?.id,

          userId,
        ],
      );

      accountCount++;

      await createEvent(
        "ACCOUNT_CONNECTED",
        "social_account",
        googleBusiness.rows[0].id,
        userId,
        {
          platform: "google_business",

          accountName: location.name,

          locationId: location.id,

          accountId: location.accountId,

          profileId: profile?.id,
        },
      );

      connectedAccounts.push(`${location.name} (Google Business)`);
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
          ? "Google Business publishing recovered"
          : `${connectedAccounts.length} Google Business location(s) connected`,
    });
  } catch (error) {
    await pool.query("ROLLBACK");

    if (
      error instanceof Error &&
      error.message === "INVALID_RECONNECT_LOCATION"
    ) {
      return Response.json(
        {
          error: "Please reconnect the same Google Business location.",
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
          error: "Reconnect platform mismatch.",
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
        error: "Failed to connect Google Business locations",
      },
      {
        status: 500,
      },
    );
  }
}
