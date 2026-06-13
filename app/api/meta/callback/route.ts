import { pool } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

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
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "No code" }, { status: 400 });
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI!)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`,
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.json(tokenData, { status: 400 });
  }

  // Get Facebook Pages
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`,
  );

  const pagesData = await pagesResponse.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    return Response.json(
      {
        error: "No Facebook Pages found",
      },
      { status: 400 },
    );
  }

  return Response.json({
    pages: pagesData.data,
  });
  /*
  // Get Instagram Business Account
  const instagramResponse = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`,
  );

  const instagramData = await instagramResponse.json();

  const instagramId = instagramData?.instagram_business_account?.id;

  if (!instagramId) {
    return Response.json(
      {
        error: "Instagram Business Account not found",
        page,
        instagramData,
      },
      { status: 400 },
    );
  }

  // Save account in database
  await pool.query(
    `
    INSERT INTO social_accounts
    (
      platform,
      account_name,
      access_token,
      page_id,
      instagram_business_id,
      user_id
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
    `,
    [
      "instagram",
      page.name,
      accessToken,
      page.id,
      instagramId,
      (session.user as any).id,
    ],
  );

  // Redirect to accounts page
  return Response.redirect(new URL("/accounts", request.url));*/
}
