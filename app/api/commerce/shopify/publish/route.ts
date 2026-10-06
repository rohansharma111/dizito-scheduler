import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishShopifyProduct } from "@/lib/publishers/shopify";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (body?.confirmLivePublish !== true) {
      return NextResponse.json(
        { success: false, error: "LIVE_PUBLISH_CONFIRMATION_REQUIRED" },
        { status: 409 },
      );
    }
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";

    if (!productId || !channelId) {
      return NextResponse.json(
        {
          success: false,
          error: "productId and channelId are required",
        },
        { status: 400 },
      );
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid authenticated user" },
        { status: 401 },
      );
    }

    const listing = await publishShopifyProduct(userId, channelId, productId, true);

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("POST /api/commerce/shopify/publish error:", error);

    const message = error instanceof Error ? error.message : "Shopify publishing failed";
    const status =
      message === "Commerce channel not found" || message === "Product not found" ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
