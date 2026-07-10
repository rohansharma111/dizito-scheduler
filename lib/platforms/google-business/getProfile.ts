import { GoogleBusinessProfile } from "./types";

export async function getProfile(
  accessToken: string,
): Promise<GoogleBusinessProfile> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },

      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error_description ||
        data?.error ||
        "Failed to fetch Google profile",
    );
  }

  return {
    id: data.id,

    name: data.name,

    email: data.email,

    picture: data.picture,
  };
}
