import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import {
  getWooCommerceChannelConfig,
  getWooCommerceSystemStatus,
  wooCommerceRequest,
} from "@/lib/platforms/woocommerce/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
    if (!channelId) {
      return NextResponse.json({ success: false, error: "channelId is required" }, { status: 400 });
    }

    const channel = await getCommerceChannelById(channelId, userId);
    if (!channel || channel.provider !== "woocommerce") {
      return NextResponse.json({ success: false, error: "WooCommerce channel not found" }, { status: 404 });
    }

    const { config } = await getWooCommerceChannelConfig(channelId, userId);
    const status = await getWooCommerceSystemStatus(config) as Record<string, unknown>;
    const products = await wooCommerceRequest<Array<Record<string, unknown>>>(
      config,
      "products?per_page=5&page=1&orderby=date&order=desc",
    );
    const environment = status.environment && typeof status.environment === "object"
      ? status.environment as Record<string, unknown>
      : {};
    const preview = products.slice(0, 5).map((product) => ({
      id: typeof product.id === "number" ? product.id : 0,
      name: typeof product.name === "string" ? product.name : "Unnamed product",
      sku: typeof product.sku === "string" ? product.sku : "",
      status: typeof product.status === "string" ? product.status : "unknown",
    }));

    return NextResponse.json({
      success: true,
      result: {
        storeName: typeof environment.site_title === "string" ? environment.site_title : channel.name,
        productCount: preview.length,
        products: preview,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WooCommerce verification failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
