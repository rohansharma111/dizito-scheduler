import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

import { exchangeToken } from "@/lib/platforms/google-business/exchangeToken";
import { getProfile } from "@/lib/platforms/google-business/getProfile";
import { getLocations } from "@/lib/platforms/google-business/getLocations";

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

  if (storedState !== state) {
    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/accounts/connect-error?platform=google-business&code=AUTH_FAILED`,
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  const userId = (session.user as any).id;

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
        refresh_token,
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
        $4,
        NULL,
        NULL,
        NOW()
      )
      `,
      [
        userId,
        token.accessToken,
        token.refreshToken,
        JSON.stringify({
          profile,
          locations,
        }),
      ],
    );

    /*
      Cleanup state cookie
    */
    cookieStore.delete("google_business_oauth_state");

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
