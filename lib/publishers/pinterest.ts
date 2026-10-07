import { PublisherContext } from "./types";
import { resolvePostMedia } from "./media";

const API = "https://api.pinterest.com/v5";

async function pollPinterestMedia(mediaId: string, accessToken: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(`${API}/media/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    if (!response.ok) throw new Error(JSON.stringify(data));
    if (data.status === "succeeded" || data.status === "SUCCESS") return data;
    if (data.status === "failed" || data.status === "FAILED") {
      throw new Error(`Pinterest video processing failed: ${JSON.stringify(data)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Pinterest video processing timed out");
}

async function publishPinterestVideo(
  media: { secure_url: string; poster_url?: string | null },
  title: string,
  description: string,
  boardId: string,
  accessToken: string,
) {
  if (!media.poster_url) {
    throw new Error("Pinterest video Pins require a cover/poster image");
  }

  const registerResponse = await fetch(`${API}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ media_type: "video" }),
  });
  const registration = await registerResponse.json();

  if (!registerResponse.ok) throw new Error(JSON.stringify(registration));

  const videoResponse = await fetch(media.secure_url);
  if (!videoResponse.ok) throw new Error("Failed to fetch video from Cloudinary");

  const form = new FormData();
  for (const [key, value] of Object.entries(registration.upload_parameters ?? {})) {
    form.append(key, String(value));
  }
  form.append(
    "file",
    new Blob([await videoResponse.arrayBuffer()], {
      type: videoResponse.headers.get("content-type") ?? "video/mp4",
    }),
  );

  const uploadResponse = await fetch(registration.upload_url, {
    method: "POST",
    body: form,
  });

  if (!uploadResponse.ok) {
    throw new Error(await uploadResponse.text());
  }

  await pollPinterestMedia(registration.media_id, accessToken);

  const pinResponse = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: title.slice(0, 100),
      description,
      media_source: {
        source_type: "video_id",
        cover_image_url: media.poster_url,
        media_id: registration.media_id,
      },
    }),
  });

  const pin = await pinResponse.json();
  if (!pinResponse.ok) throw new Error(JSON.stringify(pin));

  return { ...pin, mediaType: "video_pin" };
}

export async function publishToPinterest(context: PublisherContext) {
  const { post, account, target } = context;
  const accessToken = account.access_token;
  const boardId = account.board_id;

  if (!accessToken) throw new Error("Pinterest access token missing");
  if (!boardId) throw new Error("Pinterest board id missing");

  const resolved = await resolvePostMedia(context, "pinterest");
  if (!resolved) throw new Error("No media selected for this post");

  if (resolved.mediaType === "video_pin") {
    return publishPinterestVideo(
      resolved.media,
      post.post ?? "Created with Dizito",
      post.post ?? "",
      boardId,
      accessToken,
    );
  }

  if (resolved.mediaType !== "image") {
    throw new Error(`Pinterest publish type ${resolved.mediaType} is not implemented`);
  }

  const response = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: (post.post ?? "Created with Dizito").slice(0, 100),
      description: post.post,
      media_source: {
        source_type: "image_url",
        url: resolved.media.secure_url,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));

  return { ...data, success: true, type: "image", targetId: target.id };
}
