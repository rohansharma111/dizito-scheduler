import { PublisherContext } from "./types";

export async function publishToFacebook(context: PublisherContext) {
  const { post, account } = context;

  if (!post) {
    throw new Error("Post not found");
  }

  if (!account) {
    throw new Error("Facebook account not found");
  }

  if (!account.page_id) {
    throw new Error("Facebook page id missing");
  }

  if (!account.page_access_token) {
    throw new Error("Facebook page access token missing");
  }

  console.log("FACEBOOK PUBLISH:", {
    pageId: account.page_id,
    postId: post.id,
  });

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

        access_token: account.page_access_token,
      }),
    },
  );

  const data = await response.json();

  console.log("FACEBOOK RESPONSE:", JSON.stringify(data, null, 2));

  if (data.error) {
    throw new Error(JSON.stringify(data.error));
  }

  return data;
}
