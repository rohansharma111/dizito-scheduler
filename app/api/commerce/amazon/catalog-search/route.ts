import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getProductById } from "@/lib/commerce/products/service";
import { searchAmazonCatalogByIdentifier, searchAmazonCatalogByKeyword } from "@/lib/platforms/amazon/catalog";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await request.json()) as { channelId?: string; productId?: string; identifier?: string; identifierType?: "EAN" | "UPC" | "GTIN" | "ISBN"; keywords?: string };
    if (!body.channelId) return NextResponse.json({ success: false, error: "channelId is required" }, { status: 400 });
    if (!body.productId) return NextResponse.json({ success: false, error: "productId is required" }, { status: 400 });
    if (!body.identifier && !body.keywords) return NextResponse.json({ success: false, error: "identifier or keywords is required" }, { status: 400 });
    if (body.identifier && !body.identifierType) return NextResponse.json({ success: false, error: "identifierType is required with an identifier" }, { status: 400 });

    const userId = Number(session.user.id);
    const product = await getProductById(body.productId, userId);
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const channel = await getCommerceChannelById(body.channelId, userId);
    if (!channel || channel.provider !== "amazon") return NextResponse.json({ success: false, error: "Amazon channel not found" }, { status: 404 });
    if (channel.status !== "active") return NextResponse.json({ success: false, error: `Amazon channel is not active (status: ${channel.status})` }, { status: 409 });

    const result = body.identifier
      ? await searchAmazonCatalogByIdentifier(String(channel.id), userId, body.identifier.trim(), body.identifierType!)
      : await searchAmazonCatalogByKeyword(String(channel.id), userId, body.keywords!.trim());
    return NextResponse.json({ success: true, items: result.items, requestId: result.requestId, rateLimit: result.rateLimit });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Amazon catalog search failed" }, { status: 502 });
  }
}
