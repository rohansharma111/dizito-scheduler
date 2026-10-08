import { PublisherContext } from "./types";
import { resolvePostMedia } from "./media";
import { buildLocationParent } from "@/lib/platforms/google-business/resourceNames";

export async function publishGoogleBusinessLocationMedia(context: PublisherContext) {
  const { account } = context;

  if (!account?.access_token) throw new Error("Google Business access token missing");
  if (!account.google_account_id) throw new Error("Google account id missing");
  if (!account.google_location_id) throw new Error("Google location id missing");

  const resolved = await resolvePostMedia(context, "google_business_location_media");
  if (!resolved) throw new Error("No supported media selected for this location media item");

  if (resolved.mediaType !== "image") {
    throw new Error("Google Business location media is currently photo-only; video is fail-closed");
  }

  const parent = buildLocationParent(account);
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${parent}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mediaFormat: "PHOTO",
        sourceUrl: resolved.media.secure_url,
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || JSON.stringify(data));
  }

  return {
    id: data.name ?? null,
    platform: "google_business_location_media",
    mediaType: "image",
    raw: data,
  };
}
