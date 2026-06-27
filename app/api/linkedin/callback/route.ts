import { pool } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
      Exchange code for token
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

    console.log("LINKEDIN PROFILE:", profileData);

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
      Duplicate protection
    */

    const existing = await pool.query(
      `
        SELECT id
        FROM social_accounts
        WHERE
          platform = 'linkedin'
          AND linkedin_member_id = $1
          AND user_id = $2
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
      Save account
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

    /*
      Audit event
    */

    await createEvent(
      "ACCOUNT_CONNECTED",
      "social_account",
      accountId,
      userId,
      {
        platform: "linkedin",

        accountName,

        memberId,
      },
    );

    console.log("LINKEDIN ACCOUNT CONNECTED", accountId);

    /*
      Production redirect
    */

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
