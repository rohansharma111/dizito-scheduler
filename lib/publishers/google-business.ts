import { PublisherContext } from "./types";
import { buildLocationParent } from "@/lib/platforms/google-business/resourceNames";

export async function publishToGoogleBusiness(context: PublisherContext) {
  const { post, account } = context;

  if (!account) {
    throw new Error("Google Business account missing");
  }

  if (!account.access_token) {
    throw new Error("Google Business access token missing");
  }

  if (!account.google_account_id) {
    throw new Error("Google account id missing");
  }

  if (!account.google_location_id) {
    throw new Error("Google location id missing");
  }

  const parent = buildLocationParent(account);

  /*
      Build Local Post
  */

  const body: any = {
    languageCode: "en-US",

    summary: post.post ?? post.text ?? "",

    topicType: "STANDARD",
  };

  /*
      Optional image
  */

  const resolved = await import("./media").then(({ resolvePostMedia }) =>
    resolvePostMedia(context, "google_business_local_post"),
  );

  if (resolved?.mediaType === "video") {
    throw new Error("Google Business Local Posts do not support generic video media");
  }

  const image = resolved?.media.secure_url ?? post.secure_url ?? post.image ?? post.imageUrl ?? null;

  if (image) {
    body.media = [
      {
        mediaFormat: "PHOTO",
        sourceUrl: image,
      },
    ];
  }

  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${account.access_token}`,

        "Content-Type": "application/json",

        Accept: "application/json",
      },

      body: JSON.stringify(body),
    },
  );

  let data: any = {};

  try {
    data = await response.json();
  } catch {}
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error?.status ||
      data?.message ||
      JSON.stringify(data);

    /*
        Auth errors
    */

    if (response.status === 401 || response.status === 403) {
      throw new Error(`AUTH_ERROR:${message}`);
    }

    /*
        Rate limit
    */

    if (response.status === 429) {
      throw new Error(`RATE_LIMIT:${message}`);
    }

    /*
        Validation
    */

    if (response.status === 400) {
      throw new Error(`VALIDATION_ERROR:${message}`);
    }

    /*
        Everything else
    */

    throw new Error(message);
  }

  /*
      Success
  */

  return {
    id: data.name ?? data.localPostId ?? null,

    url: data.searchUrl ?? null,

    platform: "google_business",

    raw: data,
  };
}
