import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String((session.user as any).id);
  const rateLimit = await consumeRateLimit({ bucket: "oauth:meta", identifier: `user:${userId}`, limit: 10, windowSeconds: 600 });
  if (!rateLimit.allowed) return Response.json({ error: "Too many Meta connection attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });

  const { searchParams } = new URL(request.url);

  /*
    reconnect=accountId
    type=facebook|instagram
  */

  const reconnect = searchParams.get("reconnect");
  const reconnectType = searchParams.get("type");

  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("meta_oauth_reconnect", reconnect ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("meta_oauth_reconnect_type", reconnectType ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });


  /*
    Facebook Login for Business OAuth
  */
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,

    redirect_uri: process.env.META_REDIRECT_URI!,

    config_id: process.env.META_LOGIN_CONFIG_ID!,

    response_type: "code",

    state,
  });

  const url = `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

  return Response.redirect(url);
}
