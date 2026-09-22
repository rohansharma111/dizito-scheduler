import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prepareWooCommerceListingDraft } from "@/lib/platforms/woocommerce/draft";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const product = body.product && typeof body.product === "object" && !Array.isArray(body.product)
      ? body.product
      : null;
    const variants = Array.isArray(body.variants) ? body.variants : [];
    const providerMetadata = body.providerMetadata && typeof body.providerMetadata === "object" && !Array.isArray(body.providerMetadata)
      ? body.providerMetadata
      : {};

    if (!channelId || !productId || !product) {
      return NextResponse.json(
        { success: false, error: "channelId, productId, and product are required" },
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

    const result = await prepareWooCommerceListingDraft(Number(session.user.id), {
      channelId,
      productId,
      product,
      providerMetadata,
      variants: variants.map((variant: { variantId: string; externalId?: unknown; providerMetadata?: unknown }) => ({
        variantId: variant.variantId.trim(),
        externalId: typeof variant.externalId === "string" ? variant.externalId : null,
        providerMetadata:
          variant.providerMetadata && typeof variant.providerMetadata === "object" && !Array.isArray(variant.providerMetadata)
            ? variant.providerMetadata as Record<string, unknown>
            : {},
      })),
    });

    if (result.error === "CHANNEL_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    if (result.error === "INVALID_PROVIDER") {
      return NextResponse.json({ success: false, error: "Channel is not a WooCommerce channel" }, { status: 400 });
    }

    if (result.error === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    if (result.error === "VARIANTS_REQUIRED" || result.error === "VARIANT_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Invalid product variants" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      listing: result.listing,
      payload: "payload" in result ? result.payload : undefined,
    });
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/draft error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
