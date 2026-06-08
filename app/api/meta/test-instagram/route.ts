import { pool } from "@/lib/db";

export async function GET() {
  const postResult = await pool.query(
    `
      SELECT *
      FROM posts
      WHERE image_url IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
      `,
  );

  const post = postResult.rows[0];

  const instagramId = "17841451943449476";

  const accessToken =
    "EAAOO0cbcN7MBRhJpJLfgkyJWjRMJPoFDGSitbY1QB73uWuOSDJdVYSLzpqvOxwn61QrWYMHTx7HarLEKWSPHK95Ousg7w0hZCVwRv8K1NSk1XdW5cHyZA1GtPfPYqbWEM2sqZCMkASeMTYUlBgnHu3N3cHUw6AzsnaNp3i73uYo7Jvp7RA1CwyocMuBmS9WOt8Ano4OdwnFJfFmScXITaiHRzwlTHC098TY9G6W187B5KSsGBX8IYobNcA6dejoZAusMdBF0O4ZAB1hfOeZALxuStVYsGTJHwh";

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${instagramId}/media`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        image_url: post.image_url,

        caption: post.post,

        access_token: accessToken,
      }),
    },
  );

  const container = await response.json();

  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${instagramId}/media_publish`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        creation_id: container.id,

        access_token: accessToken,
      }),
    },
  );

  const publishData = await publishResponse.json();

  return Response.json({
    container,
    publishData,
  });
}
