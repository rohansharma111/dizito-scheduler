import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
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

  const body =
    await request.json();

  const selectedPages =
    body.selectedPages;

  if (
    !selectedPages ||
    selectedPages.length === 0
  ) {
    return Response.json(
      {
        error:
          "No pages selected",
      },
      {
        status: 400,
      }
    );
  }

  const selectionResult =
    await pool.query(
      `
      SELECT *
      FROM oauth_page_selections
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        (session.user as any).id,
      ]
    );

  if (
    selectionResult.rows.length === 0
  ) {
    return Response.json(
      {
        error:
          "OAuth session not found",
      },
      {
        status: 400,
      }
    );
  }

  const oauthData =
    selectionResult.rows[0];

  const pages =
    oauthData.pages;

  const accessToken =
    oauthData.access_token;

  const connectedAccounts =
    [];

  for (
    const selectedId
    of selectedPages
  ) {

    const page =
      pages.find(
        (p: any) =>
          p.id === selectedId
      );

    if (!page) {
      continue;
    }

    const existingAccount =
      await pool.query(
        `
        SELECT id
        FROM social_accounts
        WHERE page_id = $1
        AND user_id = $2
        `,
        [
          page.id,
          (session.user as any)
            .id,
        ]
      );

    if (
      existingAccount.rows
        .length > 0
    ) {
      continue;
    }

    const instagramResponse =
      await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );

    const instagramData =
      await instagramResponse.json();

    const instagramId =
      instagramData
        ?.instagram_business_account
        ?.id;

    if (!instagramId) {
      console.log(
        "No Instagram account linked:",
        page.name
      );

      continue;
    }

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
        (session.user as any)
          .id,
      ]
    );

    connectedAccounts.push(
      page.name
    );
  }

  return Response.json({
    success: true,
    connectedAccounts,
  });
}