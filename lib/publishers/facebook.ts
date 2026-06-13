import { pool } from "@/lib/db";

export async function publishToFacebook(postId: number) {
  const postResult = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
    [postId],
  );

  const post = postResult.rows[0];

  const accountResult = await pool.query(
    `
      SELECT *
      FROM social_accounts
      WHERE id = $1
      AND user_id = $2
      `,
    [post.social_account_id, post.user_id],
  );

  const account = accountResult.rows[0];
  if (!account) {
    throw new Error("Account ownership mismatch");
  }
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${account.page_id}/photos`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        url: post.image_url,
        caption: post.post,
        access_token: account.access_token,
      }),
    },
  );

  return await response.json();
}
