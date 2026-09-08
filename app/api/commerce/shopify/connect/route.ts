import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildShopifyAuthorizationUrl,
  createOAuthState,
  getShopifyStateCookieName,
  normalizeShopDomain,
} from "@/lib/platforms/shopify/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const shopParam = url.searchParams.get("shop");

    if (!shopParam) {
      return NextResponse.json(
        { success: false, error: "Shopify shop domain is required" },
        { status: 400 },
      );
    }

    const shop = normalizeShopDomain(shopParam);
    const state = createOAuthState();
    const response = NextResponse.redirect(buildShopifyAuthorizationUrl(shop, state));

    response.cookies.set(getShopifyStateCookieName(), state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/commerce/shopify",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to start Shopify connection",
      },
      { status: 400 },
    );
  }
}
