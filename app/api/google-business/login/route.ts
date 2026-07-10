import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;

  const redirectUri = process.env.GOOGLE_BUSINESS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      {
        error: "Google Business environment variables are missing.",
      },
      {
        status: 500,
      },
    );
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();

  cookieStore.set("google_business_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const scope = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/business.manage",
  ].join(" ");

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope,
      state,
    }).toString();

  return Response.redirect(url);
}
