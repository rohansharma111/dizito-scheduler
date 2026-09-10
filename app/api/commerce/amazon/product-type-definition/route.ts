import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { getAmazonProductTypeDefinition } from "@/lib/platforms/amazon/client";
import { summarizeAmazonListingSchema } from "@/lib/platforms/amazon/schema";
import { fetchAmazonProductTypeSchema } from "@/lib/platforms/amazon/schema-fetch";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      channelId?: string;
      productType?: string;
      parentageLevel?: "CHILD" | "PARENT" | "NONE";
      requirements?: "LISTING" | "LISTING_PRODUCT_ONLY" | "LISTING_OFFER_ONLY";
    };

    if (!body.channelId || !body.productType?.trim()) {
      return NextResponse.json({ success: false, error: "channelId and productType are required" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const channel = await getCommerceChannelById(body.channelId, userId);
    if (!channel || channel.provider !== "amazon") {
      return NextResponse.json({ success: false, error: "Amazon channel not found" }, { status: 404 });
    }
    if (channel.status !== "active") {
      return NextResponse.json({ success: false, error: `Amazon channel is not active (status: ${channel.status})` }, { status: 409 });
    }

    const sellerId = String(channel.external_account_id ?? "").trim();
    if (!sellerId) {
      return NextResponse.json({ success: false, error: "Amazon seller ID is missing from the channel" }, { status: 409 });
    }

    const parentageLevel = body.parentageLevel ?? "NONE";
    // Product editing is intentionally scoped to product facts. Offer and
    // fulfillment requirements will be handled by the separate offer layer.
    const requirements = body.requirements ?? "LISTING_PRODUCT_ONLY";
    const result = await getAmazonProductTypeDefinition(
      String(channel.id),
      body.productType.trim(),
      { sellerId, parentageLevel, requirements },
    );

    const schemaDocument = await fetchAmazonProductTypeSchema(result.data);
    const schemaSummary = summarizeAmazonListingSchema(schemaDocument);

    return NextResponse.json({
      success: true,
      productType: body.productType.trim(),
      parentageLevel,
      requirements,
      definition: result.data,
      schemaSummary,
      requestId: result.requestId,
      rateLimit: result.rateLimit,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Amazon product type definition retrieval failed" }, { status: 502 });
  }
}
