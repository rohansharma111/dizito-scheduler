import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { searchParams } = new URL(request.url);

  const reconnect = searchParams.get("reconnect");

  const reconnectType = searchParams.get("type") ?? "account";

  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("linkedin_oauth_reconnect", reconnect ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("linkedin_oauth_reconnect_type", reconnectType, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const clientId = process.env.LINKEDIN_CLIENT_ID;

  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  const scope = "openid profile email w_member_social";

  const url =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  return Response.redirect(url);
}
