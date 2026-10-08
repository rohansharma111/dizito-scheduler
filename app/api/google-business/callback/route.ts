import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { verifyOAuthState } from "@/lib/security/oauth-state";

import { exchangeToken } from "@/lib/platforms/google-business/exchangeToken";
import { getProfile } from "@/lib/platforms/google-business/getProfile";
import { getLocations } from "@/lib/platforms/google-business/getLocations";
import type { GoogleBusinessLocation } from "@/lib/platforms/google-business/types";
import { encryptSocialCredential } from "@/lib/security/social-credentials";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  const state = searchParams.get("state");

  const error = searchParams.get("error");

  if (error) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=OAUTH_CANCELLED`,
    );
  }

  if (!code) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=AUTH_FAILED`,
    );
  }

  const cookieStore = await cookies();

  const storedState = cookieStore.get("google_business_oauth_state")?.value;

  if (!storedState) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=AUTH_FAILED`,
    );
  }

  if (!verifyOAuthState(storedState, state)) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=AUTH_FAILED`,
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  const userId = (session.user as any).id;

  const reconnectAccountId =
    cookieStore.get("google_business_oauth_reconnect")?.value || null;
  const reconnectType =
    cookieStore.get("google_business_oauth_reconnect_type")?.value || "account";
  const isReconnect = Boolean(reconnectAccountId);

  try {
    /*
      Exchange authorization code
    */
    const token = await exchangeToken(code);

    /*
      Get Google profile
    */
    const profile = await getProfile(token.accessToken);

    /*
      Get Business Locations
    */
    const locations = await getLocations(token.accessToken);
    if (locations.length === 0) {
      return Response.redirect(
        `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=NO_RESOURCES`,
      );
    }

    if (isReconnect) {
      const accountResult = await pool.query(
        `
        SELECT id, account_name, google_location_id
        FROM social_accounts
        WHERE id = $1 AND user_id = $2 AND platform = 'google_business'
        `,
        [reconnectAccountId, userId],
      );

      const account = accountResult.rows[0];

      if (!account) {
        throw new Error("Google Business reconnect account not found");
      }

      const location = locations.find(
        (item: GoogleBusinessLocation) => item.id === account.google_location_id,
      );

      if (!location) {
        throw new Error("Google Business reconnect location is no longer available");
      }

      await pool.query(
        `
        UPDATE social_accounts
        SET
          access_token = NULL,
          access_token_encrypted = $1,
          refresh_token = NULL,
          refresh_token_encrypted = $2,
          status = 'connected',
          health_status = 'healthy',
          last_checked_at = NOW(),
          updated_at = NOW()
        WHERE id = $5 AND user_id = $6
        `,
        [encryptSocialCredential(token.accessToken), token.refreshToken ? encryptSocialCredential(token.refreshToken) : null, account.id, userId],
      );

      await createEvent(
        "ACCOUNT_RECONNECTED",
        "social_account",
        account.id,
        userId,
        {
          platform: "google_business",
          reconnectType,
          locationId: account.google_location_id,
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
                "x-dizito-internal-secret": process.env.NEXTAUTH_SECRET ?? "",
              },
              body: JSON.stringify({
                socialAccountId: account.id,
                userId,
              }),
            },
          );
        } catch (error) {
          console.error("Google Business recover auth failed", error);
        }
      }

      cookieStore.delete("google_business_oauth_state");
      cookieStore.delete("google_business_oauth_reconnect");
      cookieStore.delete("google_business_oauth_reconnect_type");

      return Response.redirect(
        process.env.NEXTAUTH_URL + "/accounts?reconnected=true",
      );
    }
    /*
      Remove previous temporary OAuth session
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
        access_token_encrypted,
        refresh_token,
        refresh_token_encrypted,
        pages,
        pages_encrypted,
        reconnect_account_id,
        reconnect_type,
        created_at
      )
      VALUES
      (
        $1,
        NULL,
        $2,
        NULL,
        $3,
        $4,
        NULL,
        NULL,
        NOW()
      )
      `,
      [
        userId,
        encryptSocialCredential(token.accessToken),
        token.refreshToken ? encryptSocialCredential(token.refreshToken) : null,
        encryptSocialCredential(JSON.stringify({
          profile,
          locations,
        })),
      ],
    );

    /*
      Cleanup state cookie
    */
    cookieStore.delete("google_business_oauth_state");
    cookieStore.delete("google_business_oauth_reconnect");
    cookieStore.delete("google_business_oauth_reconnect_type");

    /*
      Redirect to location selection
    */
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/select/google-business`,
    );
  } catch (error) {
    console.error("Google Business callback failed", error);

    const message = error instanceof Error ? error.message : String(error);

    let code = "UNKNOWN";

    if (message.includes("Quota exceeded")) {
      code = "QUOTA_EXCEEDED";
    } else if (message.includes("not been used")) {
      code = "API_DISABLED";
    } else if (message.includes("Permission")) {
      code = "PERMISSION_DENIED";
    } else if (
      message.includes("Invalid Credentials") ||
      message.includes("invalid_grant")
    ) {
      code = "AUTH_FAILED";
    }

    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=${code}`,
    );
  }
}
