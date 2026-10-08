import { PublisherContext } from "./types";
import { resolvePostMedia } from "./media";

const GRAPH_VERSION = "v26.0";

async function pollInstagramContainer(
  containerId: string,
  accessToken: string,
  attempts = 15,
  delayMs = 2000,
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(JSON.stringify(data.error ?? data));
    }

    if (data.status_code === "FINISHED") return data;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Instagram media processing failed: ${data.status ?? data.status_code}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Instagram media processing timed out");
}

export async function publishToInstagram(context: PublisherContext) {
  const { post, account } = context;

  if (!post) throw new Error("Post not found");
  if (!account) throw new Error("Instagram account not found");
  if (!account.instagram_business_id) throw new Error("Instagram Business ID missing");
  if (!account.access_token) throw new Error("Instagram access token missing");

  const resolved = await resolvePostMedia(context, "instagram");
  if (!resolved) throw new Error("No media selected for this post");

  const { media, mediaType } = resolved;

  const body: Record<string, string> = {
    caption: post.post ?? "",
    access_token: account.access_token,
  };

  if (mediaType === "reel") {
    body.media_type = "REELS";
    body.video_url = media.secure_url;
    if (media.poster_url) body.cover_url = media.poster_url;
  } else if (mediaType === "image") {
    body.image_url = media.secure_url;
  } else {
    throw new Error(`Instagram publish type ${mediaType} is not implemented`);
  }

  const containerResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${account.instagram_business_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const container = await containerResponse.json();
  if (!containerResponse.ok || container.error) {
    throw new Error(JSON.stringify(container.error ?? container));
  }

  if (mediaType === "reel") {
    await pollInstagramContainer(container.id, account.access_token);
  }

  const publishResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${account.instagram_business_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: account.access_token,
      }),
    },
  );

  const publishData = await publishResponse.json();
  if (!publishResponse.ok || publishData.error) {
    throw new Error(JSON.stringify(publishData.error ?? publishData));
  }

  return {
    ...publishData,
    mediaType,
    processingPolled: mediaType === "reel",
  };
}
