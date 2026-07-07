import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI;
  const scopes =
    process.env.PINTEREST_SCOPES ??
    "boards:read,pins:read,pins:write,user_accounts:read";

  if (!clientId) {
    return Response.json(
      {
        error: "Missing PINTEREST_CLIENT_ID",
      },
      {
        status: 500,
      },
    );
  }

  if (!redirectUri) {
    return Response.json(
      {
        error: "Missing PINTEREST_REDIRECT_URI",
      },
      {
        status: 500,
      },
    );
  }

  const state = randomUUID();

  const cookieStore = await cookies();

  cookieStore.set("pinterest_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const url = new URL("https://www.pinterest.com/oauth/");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);

  return Response.redirect(url.toString());
}
