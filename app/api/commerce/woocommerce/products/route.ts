import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWooCommerceChannelConfig, wooCommerceRequest } from "@/lib/platforms/woocommerce/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId")?.trim() ?? "";
    const page = Number(url.searchParams.get("page") ?? "1");
    const requestedPerPage = Number(url.searchParams.get("perPage") ?? "20");
    if (!channelId) return NextResponse.json({ success: false, error: "channelId is required" }, { status: 400 });
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedPerPage) || requestedPerPage < 1 || requestedPerPage > 50) {
      return NextResponse.json({ success: false, error: "Invalid pagination. page must be positive and perPage must be between 1 and 50." }, { status: 400 });
    }

    const { config } = await getWooCommerceChannelConfig(channelId, userId);
    const products = await wooCommerceRequest<Array<Record<string, unknown>>>(
      config,
      `products?per_page=${requestedPerPage}&page=${page}&orderby=date&order=desc`,
    );
    const items = products.map((product) => {
      const images = Array.isArray(product.images) ? product.images : [];
      const firstImage = images[0] && typeof images[0] === "object" ? images[0] as Record<string, unknown> : {};
      return {
        id: typeof product.id === "number" ? product.id : 0,
        name: typeof product.name === "string" ? product.name : "Unnamed product",
        sku: typeof product.sku === "string" ? product.sku : "",
        status: typeof product.status === "string" ? product.status : "unknown",
        type: typeof product.type === "string" ? product.type : "simple",
        price: typeof product.price === "string" ? product.price : "",
        currency: typeof product.currency === "string" ? product.currency : "",
        stockStatus: typeof product.stock_status === "string" ? product.stock_status : "unknown",
        permalink: typeof product.permalink === "string" ? product.permalink : "",
        image: typeof firstImage.src === "string" ? firstImage.src : "",
      };
    });
    return NextResponse.json({ success: true, page, perPage: requestedPerPage, products: items, hasMore: items.length === requestedPerPage });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to read WooCommerce products. Check the connection and try again." }, { status: 502 });
  }
}
