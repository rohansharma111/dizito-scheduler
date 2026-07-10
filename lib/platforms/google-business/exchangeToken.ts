import { GoogleBusinessTokenResponse } from "./types";

export async function exchangeToken(
  code: string,
): Promise<GoogleBusinessTokenResponse> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;

  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;

  const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URI;

  if (!clientId) {
    throw new Error("Missing GOOGLE_BUSINESS_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing GOOGLE_BUSINESS_CLIENT_SECRET");
  }

  if (!redirectUri) {
    throw new Error("Missing GOOGLE_BUSINESS_REDIRECT_URI");
  }

  const body = new URLSearchParams();

  body.set("client_id", clientId);

  body.set("client_secret", clientSecret);

  body.set("code", code);

  body.set("grant_type", "authorization_code");

  body.set("redirect_uri", redirectUri);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",

    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },

    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google Business token exchange failed",
    );
  }

  return {
    accessToken: data.access_token,

    refreshToken: data.refresh_token ?? null,

    expiresIn: data.expires_in,

    scope: data.scope ?? "",

    tokenType: data.token_type ?? "Bearer",
  };
}
