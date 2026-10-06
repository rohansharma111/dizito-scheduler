import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductListings } from "@/lib/commerce/listings/service";
import { syncShopifyProduct } from "@/lib/publishers/shopify-sync";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    if (!productId || !channelId) {
      return NextResponse.json({ success: false, error: "productId and channelId are required" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const listings = await getProductListings(userId);
    const listing = listings.find((row) => String(row.channel_id) === channelId && String(row.product_id) === productId);
    if (!listing) return NextResponse.json({ success: false, error: "Product listing not found" }, { status: 404 });
    if (!listing.external_id) return NextResponse.json({ success: false, error: "Shopify product has not been published for this listing" }, { status: 400 });

    const result = await syncShopifyProduct(userId, channelId, String(listing.id), String(listing.external_id));
    return NextResponse.json({ success: true, listing: result });
  } catch (error) {
    console.error("POST /api/commerce/shopify/sync error:", error);
    const message = error instanceof Error ? error.message : "Shopify sync failed";
    const status = message === "Product listing not found" || message === "Product not found" ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
