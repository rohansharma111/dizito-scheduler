import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createProductListing,
  getProductListings,
} from "@/lib/commerce/listings/service";

export async function GET() {
  const session = await auth();
  const userId = Number(session?.user?.id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const listings = await getProductListings(userId);
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = Number(session?.user?.id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body?.channelId || !body?.productId) {
    return NextResponse.json(
      { error: "CHANNEL_ID_AND_PRODUCT_ID_REQUIRED" },
      { status: 400 },
    );
  }

  const result = await createProductListing(userId, {
    channelId: String(body.channelId),
    productId: String(body.productId),
    status: body.status,
    providerMetadata: body.providerMetadata,
  });

  if (result.error === "CHANNEL_NOT_FOUND" || result.error === "PRODUCT_NOT_FOUND") {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  if (result.error === "LISTING_ALREADY_EXISTS") {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ listing: result.listing }, { status: 201 });
}
