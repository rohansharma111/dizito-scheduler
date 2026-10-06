import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildFlipkartAuthorizationUrl,
  createOAuthState,
  getFlipkartStateCookieName,
} from "@/lib/platforms/flipkart/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new Error("Invalid authenticated user");
    }

    const state = createOAuthState(userId);
    const response = NextResponse.redirect(buildFlipkartAuthorizationUrl(state));

    response.cookies.set(getFlipkartStateCookieName(), state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/api/commerce/flipkart",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to start Flipkart connection",
      },
      { status: 400 },
    );
  }
}
