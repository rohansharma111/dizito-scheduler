import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById, updateCommerceChannel } from "@/lib/commerce/channels/service";
import { getShop } from "@/lib/platforms/shopify/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(session.user.id);
  const channel = await getCommerceChannelById(id, userId);
  if (!channel) {
    return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
  }

  try {
    if (String(channel.provider).toLowerCase() !== "shopify") {
      return NextResponse.json({ success: false, error: "Health check is not supported for this provider" }, { status: 400 });
    }

    const shop = await getShop(id);
    const updated = await updateCommerceChannel(id, userId, {
      status: "active",
      metadata: {
        ...(channel.metadata ?? {}),
        shopDomain: shop.shop.myshopifyDomain,
        shopName: shop.shop.name,
        lastHealthCheckAt: new Date().toISOString(),
        lastHealthCheckError: null,
      },
    });

    return NextResponse.json({ success: true, channel: updated, shop: shop.shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify health check failed";
    await updateCommerceChannel(id, userId, {
      status: "error",
      metadata: {
        ...(channel.metadata ?? {}),
        lastHealthCheckAt: new Date().toISOString(),
        lastHealthCheckError: message,
      },
    });
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
