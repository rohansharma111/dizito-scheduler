import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProductListings } from "@/lib/commerce/listings/service";
import { upsertProductListingDraft } from "@/lib/commerce/listings/draft";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const listings = await getProductListings(userId);

    return NextResponse.json({ success: true, listings });
  } catch (error) {
    console.error("GET /api/commerce/listings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const providerMetadata =
      body.providerMetadata && typeof body.providerMetadata === "object" && !Array.isArray(body.providerMetadata)
        ? body.providerMetadata
        : {};
    const variants = Array.isArray(body.variants) ? body.variants : [];

    if (!channelId || !productId) {
      return NextResponse.json(
        { success: false, error: "channelId and productId are required" },
        { status: 400 },
      );
    }

    if (
      variants.length === 0 ||
      variants.some(
        (variant: unknown) =>
          !variant ||
          typeof variant !== "object" ||
          typeof (variant as { variantId?: unknown }).variantId !== "string" ||
          !(variant as { variantId: string }).variantId.trim(),
      )
    ) {
      return NextResponse.json(
        { success: false, error: "At least one valid variant is required" },
        { status: 400 },
      );
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await upsertProductListingDraft(userId, {
      channelId,
      productId,
      providerMetadata,
      variants: variants.map((variant: { variantId: string; externalId?: unknown; providerMetadata?: unknown }) => ({
        variantId: variant.variantId.trim(),
        ...(typeof variant.externalId === "string" ? { externalId: variant.externalId } : {}),
        providerMetadata:
          variant.providerMetadata && typeof variant.providerMetadata === "object" && !Array.isArray(variant.providerMetadata)
            ? variant.providerMetadata as Record<string, unknown>
            : {},
      })),
    });

    if (result.error === "CHANNEL_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    if (result.error === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    if (result.error === "VARIANTS_REQUIRED" || result.error === "VARIANT_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Invalid product variants" }, { status: 400 });
    }

    if (result.error === "LISTING_VARIANT_EXTERNAL_ID_CONFLICT") {
      return NextResponse.json(
        { success: false, error: "Listing variant external ID conflict" },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, listing: result.listing });
  } catch (error) {
    console.error("POST /api/commerce/listings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
