import { pool } from "@/lib/db";

export async function publishToInstagram(postId: number) {
  const result = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
    [postId],
  );

  const post = result.rows[0];

const accountResult =
  await pool.query(
    `
    SELECT *
    FROM social_accounts
    WHERE id = $1
    `,
    [post.social_account_id]
  );

const account =
  accountResult.rows[0];

  const containerResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.instagram_business_id}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: post.image_url,
        caption: post.post,
        access_token: account.access_token,
      }),
    },
  );

  const container = await containerResponse.json();
  console.log("Container:", container);

  await new Promise(
  (resolve) => setTimeout(resolve, 10000)
);

  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${account.instagram_business_id}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: account.access_token,
      }),
    },
  );

  const publishData = await publishResponse.json();
  console.log("Publish:", publishData);

  if (container.error) {
    throw new Error(JSON.stringify(container.error));
  }

  if (publishData.error) {
    throw new Error(JSON.stringify(publishData.error));
  }
}
