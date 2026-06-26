import { PublisherContext } from "./types";

export async function publishToLinkedIn(context: PublisherContext) {
  if (context.post.image_url) {
    return publishLinkedInImage(context);
  }

  return publishLinkedInText(context);
}

async function publishLinkedInText(context: PublisherContext) {
  const { post, account, target } = context;

  const accessToken = account.access_token;

  const memberId = account.linkedin_member_id;

  if (!accessToken) {
    throw new Error("LinkedIn access token missing");
  }

  if (!memberId) {
    throw new Error("LinkedIn member id missing");
  }

  console.log("Publishing LinkedIn Text:", {
    postId: post.id,
    targetId: target.id,
    memberId,
  });

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${accessToken}`,

      "Content-Type": "application/json",

      "LinkedIn-Version": "202506",

      "X-Restli-Protocol-Version": "2.0.0",
    },

    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,

      commentary: post.post,

      visibility: "PUBLIC",

      distribution: {
        feedDistribution: "MAIN_FEED",

        targetEntities: [],

        thirdPartyDistributionChannels: [],
      },

      lifecycleState: "PUBLISHED",

      isReshareDisabledByAuthor: false,
    }),
  });

  const raw = await response.text();

  console.log("LINKEDIN TEXT STATUS:", response.status);

  console.log("LINKEDIN TEXT RESPONSE:", raw);

  if (!response.ok) {
    throw new Error(raw);
  }

  return {
    success: true,
    type: "text",
  };
}

async function publishLinkedInImage(context: PublisherContext) {
  const { post, account, target } = context;

  const accessToken = account.access_token;

  const memberId = account.linkedin_member_id;

  if (!accessToken) {
    throw new Error("LinkedIn access token missing");
  }

  if (!memberId) {
    throw new Error("LinkedIn member id missing");
  }

  if (!post.image_url) {
    throw new Error("LinkedIn image missing");
  }

  console.log("Publishing LinkedIn Image:", {
    postId: post.id,
    targetId: target.id,
    memberId,
    image: post.image_url,
  });

  /*
    STEP 1
    Register upload
  */

  const registerResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${accessToken}`,

        "LinkedIn-Version": "202506",

        "Content-Type": "application/json",

        "X-Restli-Protocol-Version": "2.0.0",
      },

      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${memberId}`,
        },
      }),
    },
  );

  const registerData = await registerResponse.json();

  console.log("LINKEDIN REGISTER:", JSON.stringify(registerData, null, 2));

  if (!registerResponse.ok) {
    throw new Error(JSON.stringify(registerData));
  }

  const uploadUrl = registerData?.value?.uploadUrl;

  const imageUrn = registerData?.value?.image;

  if (!uploadUrl) {
    throw new Error("LinkedIn uploadUrl missing");
  }

  if (!imageUrn) {
    throw new Error("LinkedIn image URN missing");
  }

  /*
    STEP 2
    Download image
  */

  const imageResponse = await fetch(post.image_url);

  if (!imageResponse.ok) {
    throw new Error("Failed to download image");
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  /*
    STEP 3
    Upload binary
  */

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",

    headers: {
      "Content-Type": "application/octet-stream",
    },

    body: imageBuffer,
  });

  console.log("LINKEDIN UPLOAD STATUS:", uploadResponse.status);

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();

    throw new Error(error);
  }

  /*
    STEP 4
    Create post
  */

  const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${accessToken}`,

      "Content-Type": "application/json",

      "LinkedIn-Version": "202506",

      "X-Restli-Protocol-Version": "2.0.0",
    },

    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,

      commentary: post.post,

      visibility: "PUBLIC",

      distribution: {
        feedDistribution: "MAIN_FEED",
      },

      content: {
        media: {
          id: imageUrn,
        },
      },

      lifecycleState: "PUBLISHED",

      isReshareDisabledByAuthor: false,
    }),
  });

  const raw = await postResponse.text();

  console.log("LINKEDIN IMAGE STATUS:", postResponse.status);

  console.log("LINKEDIN IMAGE RESPONSE:", raw);

  if (!postResponse.ok) {
    throw new Error(raw);
  }

  return {
    success: true,
    type: "image",
  };
}
