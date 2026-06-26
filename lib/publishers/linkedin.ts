import { PublisherContext } from "./types";

export async function publishToLinkedIn(context: PublisherContext) {
  const { post, account, target } = context;

  const accessToken = account.access_token;

  const memberId = account.linkedin_member_id;

  if (!accessToken) {
    throw new Error("LinkedIn access token missing");
  }

  if (!memberId) {
    throw new Error("LinkedIn member id missing");
  }

  console.log("Publishing LinkedIn Post:", {
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

  const rawResponse = await response.text();

  console.log("LINKEDIN STATUS:", response.status);

  console.log("LINKEDIN RAW RESPONSE:", rawResponse);

  let data: any = {};

  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    data = {
      raw: rawResponse,
    };
  }

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  console.log("LINKEDIN SUCCESS:", {
    postId: post.id,

    targetId: target.id,

    status: response.status,

    data,
  });

  return {
    success: true,

    status: response.status,

    data,
  };
}
