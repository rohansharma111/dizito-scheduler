import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildAmazonAuthorizationUrl,
  createAmazonOAuthState,
  getAmazonStateCookieName,
} from "@/lib/platforms/amazon/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = Number(session.user.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 401 });
    }

    const state = createAmazonOAuthState(userId);
    const response = NextResponse.redirect(buildAmazonAuthorizationUrl(state));

    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(getAmazonStateCookieName(), state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/commerce/amazon",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to start Amazon connection",
      },
      { status: 400 },
    );
  }
}
