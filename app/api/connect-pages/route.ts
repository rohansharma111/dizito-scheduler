import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    [(session.user as any).id],
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

  const pages = oauthData.pages;

  const accessToken = oauthData.access_token;

  const connectedAccounts = [];

  for (const selectedId of selectedPages) {
    const page = pages.find((p: any) => p.id === selectedId);

    if (!page) {
      continue;
    }

    const userId = (session.user as any).id;

    /*
    FACEBOOK ACCOUNT
  */

    const existingFacebook = await pool.query(
      `
      SELECT id
      FROM social_accounts
      WHERE
        page_id = $1
        AND platform = 'facebook'
        AND user_id = $2
      `,
      [page.id, userId],
    );

    if (existingFacebook.rows.length === 0) {
      await pool.query(
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

      connectedAccounts.push(`${page.name} (Facebook)`);
    }

    /*
    INSTAGRAM ACCOUNT
  */

    const instagramResponse = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
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
      await pool.query(
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

      connectedAccounts.push(`${page.name} (Instagram)`);
    }
  }

  return Response.json({
    success: true,
    connectedAccounts,
  });
}
