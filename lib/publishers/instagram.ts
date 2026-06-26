import { PublisherContext } from "./types";

export async function publishToInstagram(
  context: PublisherContext,
) {
  const { post, account } = context;

  if (!post) {
    throw new Error(
      "Post not found",
    );
  }

  if (!account) {
    throw new Error(
      "Instagram account not found",
    );
  }

  if (!account.instagram_business_id) {
    throw new Error(
      "Instagram Business ID missing",
    );
  }

  if (!account.access_token) {
    throw new Error(
      "Instagram access token missing",
    );
  }

  const containerResponse =
    await fetch(
      `https://graph.facebook.com/v19.0/${account.instagram_business_id}/media`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          image_url:
            post.image_url,
          caption:
            post.post,
          access_token:
            account.access_token,
        }),
      },
    );

  const container =
    await containerResponse.json();

  console.log(
    "INSTAGRAM CONTAINER:",
    JSON.stringify(
      container,
      null,
      2,
    ),
  );

  if (container.error) {
    throw new Error(
      JSON.stringify(
        container.error,
      ),
    );
  }

  // Meta sometimes needs a few seconds
  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        10000,
      ),
  );

  const publishResponse =
    await fetch(
      `https://graph.facebook.com/v19.0/${account.instagram_business_id}/media_publish`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          creation_id:
            container.id,
          access_token:
            account.access_token,
        }),
      },
    );

  const publishData =
    await publishResponse.json();

  console.log(
    "INSTAGRAM PUBLISH:",
    JSON.stringify(
      publishData,
      null,
      2,
    ),
  );

  if (publishData.error) {
    throw new Error(
      JSON.stringify(
        publishData.error,
      ),
    );
  }

  return publishData;
}