import { PinterestProfile } from "./types";

export async function getProfile(
  accessToken: string,
): Promise<PinterestProfile> {
  const response = await fetch("https://api.pinterest.com/v5/user_account", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Failed to fetch Pinterest profile",
    );
  }

  return {
    id: data.id,
    username: data.username,
    displayName: data.business_name || data.username,
    profileImage: data.profile_image,
    accountType: data.account_type,
  };
}
