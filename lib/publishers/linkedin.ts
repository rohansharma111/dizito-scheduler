import { PublisherContext } from "./types";
import { resolvePostMedia } from "./media";

const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION ?? "202603";

function headers(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": LINKEDIN_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

async function publishLinkedInText(context: PublisherContext) {
  const { post, account, target } = context;
  const accessToken = account.access_token;
  const memberId = account.linkedin_member_id;

  if (!accessToken) throw new Error("LinkedIn access token missing");
  if (!memberId) throw new Error("LinkedIn member id missing");

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: post.post,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(raw);
  return { success: true, type: "text", targetId: target.id };
}

async function uploadLinkedInVideo(
  secureUrl: string,
  bytes: number,
  accessToken: string,
  owner: string,
) {
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/videos?action=initializeUpload",
    {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner,
          fileSizeBytes: bytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    },
  );

  const init = await initResponse.json();
  if (!initResponse.ok) throw new Error(JSON.stringify(init));

  const value = init.value;
  const instructions = value?.uploadInstructions ?? [];
  if (!value?.video || instructions.length === 0) {
    throw new Error("LinkedIn video upload instructions missing");
  }

  const etags: string[] = [];

  for (const instruction of instructions) {
    const sourceResponse = await fetch(secureUrl, {
      headers: { Range: `bytes=${instruction.firstByte}-${instruction.lastByte}` },
    });
    if (!sourceResponse.ok || !sourceResponse.body) {
      throw new Error(`Unable to read Cloudinary video range ${instruction.firstByte}-${instruction.lastByte}`);
    }

    const contentLength = instruction.lastByte - instruction.firstByte + 1;
    const uploadResponse = await fetch(instruction.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(contentLength),
      },
      body: sourceResponse.body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    if (!uploadResponse.ok) {
      throw new Error(await uploadResponse.text());
    }

    const etag = uploadResponse.headers.get("etag");
    if (!etag) throw new Error("LinkedIn video upload did not return an ETag");
    etags.push(etag.replace(/^"|"$/g, ""));
  }

  const finalizeResponse = await fetch(
    "https://api.linkedin.com/rest/videos?action=finalizeUpload",
    {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: value.video,
          uploadToken: value.uploadToken ?? "",
          uploadedPartIds: etags,
        },
      }),
    },
  );

  if (!finalizeResponse.ok) {
    throw new Error(await finalizeResponse.text());
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const statusResponse = await fetch(
      `https://api.linkedin.com/rest/videos/${encodeURIComponent(value.video)}`,
      { headers: headers(accessToken) },
    );
    const status = await statusResponse.json();

    if (!statusResponse.ok) throw new Error(JSON.stringify(status));
    if (status.status === "AVAILABLE") return value.video;
    if (status.status === "PROCESSING_FAILED") {
      throw new Error(status.processingFailureReason || "LinkedIn video processing failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("LinkedIn video processing timed out");
}

async function publishLinkedInImage(context: PublisherContext, media: any) {
  const { post, account, target } = context;
  const accessToken = account.access_token;
  const memberId = account.linkedin_member_id;

  if (!accessToken) throw new Error("LinkedIn access token missing");
  if (!memberId) throw new Error("LinkedIn member id missing");

  const registerResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: { owner: `urn:li:person:${memberId}` },
      }),
    },
  );
  const registerData = await registerResponse.json();
  if (!registerResponse.ok) throw new Error(JSON.stringify(registerData));

  const uploadUrl = registerData?.value?.uploadUrl;
  const imageUrn = registerData?.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error("LinkedIn image upload metadata missing");

  const imageResponse = await fetch(media.secure_url);
  if (!imageResponse.ok || !imageResponse.body) throw new Error("Failed to download image");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: imageResponse.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  if (!uploadResponse.ok) throw new Error(await uploadResponse.text());

  const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: post.post,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED" },
      content: { media: { id: imageUrn } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  const raw = await postResponse.text();
  if (!postResponse.ok) throw new Error(raw);
  return { success: true, type: "image", targetId: target.id };
}

async function publishLinkedInVideo(context: PublisherContext, media: any) {
  const { post, account, target } = context;
  const accessToken = account.access_token;
  const memberId = account.linkedin_member_id;

  if (!accessToken) throw new Error("LinkedIn access token missing");
  if (!memberId) throw new Error("LinkedIn member id missing");
  if (!media.bytes) throw new Error("LinkedIn video byte size is required");

  const videoUrn = await uploadLinkedInVideo(
    media.secure_url,
    Number(media.bytes),
    accessToken,
    `urn:li:person:${memberId}`,
  );

  const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: post.post,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED" },
      content: { media: { title: post.post?.slice(0, 200) ?? "Dizito video", id: videoUrn } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  const raw = await postResponse.text();
  if (!postResponse.ok) throw new Error(raw);
  return { success: true, type: "video", videoUrn, targetId: target.id };
}

export async function publishToLinkedIn(context: PublisherContext) {
  const resolved = await resolvePostMedia(context, "linkedin");

  if (!resolved) {
    return publishLinkedInText(context);
  }

  if (resolved.mediaType === "image") {
    return publishLinkedInImage(context, resolved.media);
  }

  if (resolved.mediaType === "video") {
    return publishLinkedInVideo(context, resolved.media);
  }

  throw new Error(`LinkedIn publish type ${resolved.mediaType} is not implemented`);
}
