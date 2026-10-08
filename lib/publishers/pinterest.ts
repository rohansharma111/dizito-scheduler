import { PublisherContext } from "./types";

export async function publishToPinterest(context: PublisherContext) {
  const { post, account, target } = context;

  const accessToken = account.access_token;

  const boardId = account.board_id;

  if (!accessToken) {
    throw new Error("Pinterest access token missing");
  }

  if (!boardId) {
    throw new Error("Pinterest board id missing");
  }

  if (!post.secure_url) {
    throw new Error("Pinterest requires an image.");
  }

  console.log("Publishing Pinterest Pin:", {
    postId: post.id,
    targetId: target.id,
    boardId,
    image: post.secure_url,
  });

  const response = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${accessToken}`,

      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      board_id: boardId,

      title: post.post.substring(0, 100) ?? "Created with Dizito",

      description: post.post,

      media_source: {
        source_type: "image_url",

        url: post.secure_url,
      },
    }),
  });

  await response.text();

  console.log("PINTEREST STATUS:", response.status);

  console.log("PINTEREST RESPONSE RECEIVED:", response.status);

  if (!response.ok) {
    throw new Error(`Pinterest publish failed: HTTP ${response.status}`);
  }

  return {
    success: true,
    type: "image",
  };
}
