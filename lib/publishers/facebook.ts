import { PublisherContext } from "./types";
import { resolvePostMedia } from "./media";

const GRAPH_VERSION = "v26.0";

export async function publishToFacebook(context: PublisherContext) {
  const { post, account } = context;

  if (!post) throw new Error("Post not found");
  if (!account) throw new Error("Facebook account not found");
  if (!account.page_id) throw new Error("Facebook page id missing");
  if (!account.page_access_token) throw new Error("Facebook page access token missing");

  const resolved = await resolvePostMedia(context, "facebook");
  if (!resolved) throw new Error("No media selected for this post");

  const { media, mediaType } = resolved;

  if (mediaType === "image") {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${account.page_id}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: media.secure_url,
          caption: post.post,
          access_token: account.page_access_token,
        }),
      },
    );

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(JSON.stringify(data.error ?? data));
    return { ...data, mediaType: "image" };
  }

  if (mediaType !== "video") {
    throw new Error(`Facebook publish type ${mediaType} is not implemented`);
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${account.page_id}/videos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: media.secure_url,
        description: post.post,
        access_token: account.page_access_token,
      }),
    },
  );

  const data = await response.json();
  if (!response.ok || data.error) throw new Error(JSON.stringify(data.error ?? data));

  return { ...data, mediaType: "video" };
}
