import { PinterestToken } from "./types";

export async function exchangeToken(code: string): Promise<PinterestToken> {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI;

  if (!clientId) {
    throw new Error("Missing PINTEREST_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing PINTEREST_CLIENT_SECRET");
  }

  if (!redirectUri) {
    throw new Error("Missing PINTEREST_REDIRECT_URI");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const body = new URLSearchParams();

  body.set("grant_type", "authorization_code");

  body.set("code", code);

  body.set("redirect_uri", redirectUri);

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",

    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },

    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Pinterest token exchange failed",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
    scope: data.scope ?? "",
  };
}
