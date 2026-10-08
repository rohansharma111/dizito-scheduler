import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);\n  if (!session?.user) {\n    return Response.json({ error: "Unauthorized" }, { status: 401 });\n  }\n\n  const { searchParams } = new URL(request.url);

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
