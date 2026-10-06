import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prepareCommerceProviderDraft } from "@/lib/commerce/providers/service";
import type { WooCommerceAdapterPayload } from "@/lib/platforms/woocommerce/adapter";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const product =
      body.product && typeof body.product === "object" && !Array.isArray(body.product)
        ? body.product
        : null;
    const variants = Array.isArray(body.variants) ? body.variants : [];
    const providerMetadata =
      body.providerMetadata &&
      typeof body.providerMetadata === "object" &&
      !Array.isArray(body.providerMetadata)
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

    const payload = {
      action: "draft",
      input: {
        channelId,
        productId,
        product,
        providerMetadata,
        variants: variants.map(
          (variant: {
            variantId: string;
            externalId?: unknown;
            providerMetadata?: unknown;
          }) => ({
            variantId: variant.variantId.trim(),
            externalId: typeof variant.externalId === "string" ? variant.externalId : null,
            providerMetadata:
              variant.providerMetadata &&
              typeof variant.providerMetadata === "object" &&
              !Array.isArray(variant.providerMetadata)
                ? (variant.providerMetadata as Record<string, unknown>)
                : {},
          }),
        ),
      },
    } satisfies WooCommerceAdapterPayload;

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await prepareCommerceProviderDraft("woocommerce", {
      context: { channelId, userId },
      payload,
    });

    if (result.status === "failed" && result.error) {
      const status =
        result.error.code === "CHANNEL_NOT_FOUND" || result.error.code === "PRODUCT_NOT_FOUND"
          ? 404
          : 400;
      return NextResponse.json(
        { success: false, error: result.error.code },
        { status },
      );
    }

    const data =
      result.data && typeof result.data === "object"
        ? (result.data as { listing?: unknown; payload?: unknown })
        : {};
    return NextResponse.json({
      success: true,
      listing: data.listing,
      payload: data.payload,
    });
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/draft error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
