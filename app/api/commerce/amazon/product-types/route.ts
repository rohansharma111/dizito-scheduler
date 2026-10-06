import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getProductDetails } from "@/lib/commerce/products/service";
import { getAmazonMarketplaceId } from "@/lib/platforms/amazon/auth";
import { searchAmazonProductTypes } from "@/lib/platforms/amazon/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      channelId?: string;
      productId?: string;
    };

    if (!body.channelId || !body.productId) {
      return NextResponse.json(
        { success: false, error: "channelId and productId are required" },
        { status: 400 },
      );
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const channel = await getCommerceChannelById(body.channelId, userId);

    if (!channel || channel.provider !== "amazon") {
      return NextResponse.json(
        { success: false, error: "Amazon channel not found" },
        { status: 404 },
      );
    }

    if (channel.status !== "active") {
      return NextResponse.json(
        { success: false, error: `Amazon channel is not active (status: ${channel.status})` },
        { status: 409 },
      );
    }

    const product = await getProductDetails(body.productId, userId);
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const result = await searchAmazonProductTypes(String(channel.id), userId, product.name);

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
      },
      marketplaceId: getAmazonMarketplaceId(),
      productTypes: result.data.productTypes ?? [],
      productTypeVersion: result.data.productTypeVersion ?? null,
      requestId: result.requestId,
      rateLimit: result.rateLimit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Amazon product type discovery failed",
      },
      { status: 502 },
    );
  }
}
