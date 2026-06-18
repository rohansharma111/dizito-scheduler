import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request
) {
  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const code =
    searchParams.get("code");

  if (!code) {
    return Response.json(
      {
        error: "No code",
      },
      {
        status: 400,
      }
    );
  }

  const tokenResponse =
    await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            grant_type:
              "authorization_code",

            code,

            redirect_uri:
              process.env
                .LINKEDIN_REDIRECT_URI!,

            client_id:
              process.env
                .LINKEDIN_CLIENT_ID!,

            client_secret:
              process.env
                .LINKEDIN_CLIENT_SECRET!,
          }),
      }
    );

  const tokenData =
    await tokenResponse.json();

  const accessToken =
    tokenData.access_token;

  if (!accessToken) {
    return Response.json(
      tokenData,
      {
        status: 400,
      }
    );
  }

  const profileResponse =
    await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  const profileData =
    await profileResponse.json();

  console.log(
    "LINKEDIN PROFILE",
    profileData
  );

  const memberId =
    profileData.sub;

  const accountName =
    profileData.name ||
    profileData.email ||
    "LinkedIn";

  if (!memberId) {
    return Response.json(
      profileData,
      {
        status: 400,
      }
    );
  }

  const existing =
    await pool.query(
      `
      SELECT id
      FROM social_accounts
      WHERE
        platform = 'linkedin'
        AND linkedin_member_id = $1
        AND user_id = $2
      `,
      [
        memberId,
        (session.user as any)
          .id,
      ]
    );

  if (
    existing.rows.length > 0
  ) {
    return Response.redirect(
      new URL(
        "/accounts",
        request.url
      )
    );
  }

  await pool.query(
    `
    INSERT INTO social_accounts
    (
      platform,
      account_name,
      access_token,
      linkedin_member_id,
      user_id
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5
    )
    `,
    [
      "linkedin",
      accountName,
      accessToken,
      memberId,
      (session.user as any)
        .id,
    ]
  );

  return Response.redirect(
    new URL(
      "/accounts",
      request.url
    )
  );
}