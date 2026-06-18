import { pool } from "@/lib/db";

export async function publishToLinkedIn(
  postId: number
) {
  const postResult =
    await pool.query(
      `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
      [postId]
    );

  const post =
    postResult.rows[0];

  if (!post) {
    throw new Error(
      "Post not found"
    );
  }

  const accountResult =
    await pool.query(
      `
      SELECT *
      FROM social_accounts
      WHERE id = $1
      `,
      [
        post.social_account_id
      ]
    );

  const account =
    accountResult.rows[0];

  if (!account) {
    throw new Error(
      "LinkedIn account not found"
    );
  }

  const accessToken =
    account.access_token;

  const memberId =
    account.linkedin_member_id;

  if (!accessToken) {
    throw new Error(
      "LinkedIn access token missing"
    );
  }

  if (!memberId) {
    throw new Error(
      "LinkedIn member id missing"
    );
  }

  const response =
    await fetch(
      "https://api.linkedin.com/rest/posts",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
          "LinkedIn-Version":
            "202506",
          "X-Restli-Protocol-Version":
            "2.0.0",
        },

        body: JSON.stringify({
          author:
            `urn:li:person:${memberId}`,

          commentary:
            post.post,

          visibility:
            "PUBLIC",

          distribution: {
            feedDistribution:
              "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels:
              [],
          },

          lifecycleState:
            "PUBLISHED",

          isReshareDisabledByAuthor:
            false,
        }),
      }
    );

  const data =
    await response.json();

  console.log(
    "LINKEDIN RESPONSE:",
    JSON.stringify(
      data,
      null,
      2
    )
  );

  if (!response.ok) {
    throw new Error(
      JSON.stringify(data)
    );
  }

  return data;
}