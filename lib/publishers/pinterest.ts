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
  media: {
    secure_url: string;
    poster_url?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    bytes?: number | null;
  },
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
  if (!videoResponse.ok || !videoResponse.body) {
    throw new Error("Failed to fetch video from Cloudinary");
  }

  const boundary = `----DizitoPinterestVideo-${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const uploadFields = Object.entries(registration.upload_parameters ?? {}).map(
    ([key, value]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${String(value)}\r\n`,
  );
  const fileName = (media.file_name ?? "video.mp4").replace(/[\r\n"]/g, "_");
  const contentType = media.mime_type ?? videoResponse.headers.get("content-type") ?? "video/mp4";
  const preamble = encoder.encode(
    uploadFields.join("") +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--\r\n`);

  if (!media.bytes || media.bytes <= 0) {
    throw new Error("Pinterest video byte size is required for streaming upload");
  }

  const contentLength = preamble.byteLength + Number(media.bytes) + epilogue.byteLength;
  const reader = videoResponse.body.getReader();
  let preambleSent = false;
  let finished = false;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!preambleSent) {
        controller.enqueue(preamble);
        preambleSent = true;
      }

      if (finished) {
        controller.enqueue(epilogue);
        controller.close();
        return;
      }

      const chunk = await reader.read();
      if (chunk.done) {
        finished = true;
        return;
      }

      controller.enqueue(chunk.value);
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  const uploadResponse = await fetch(registration.upload_url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(contentLength),
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

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
