import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prepareCommerceProviderDraft } from "@/lib/commerce/providers/service";
import type { FlipkartAdapterPayload } from "@/lib/platforms/flipkart/adapter";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
    const product = body?.product;
    const variants = Array.isArray(body?.variants) ? body.variants : [];
    const providerMetadata =
      body?.providerMetadata &&
      typeof body.providerMetadata === "object" &&
      !Array.isArray(body.providerMetadata)
        ? body.providerMetadata
        : {};

    if (!channelId || !product || typeof product !== "object" || Array.isArray(product)) {
      return NextResponse.json(
        { success: false, error: "channelId and product are required" },
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
        product,
        providerMetadata,
        variants: variants.map(
          (variant: {
            variantId: string;
            externalId?: unknown;
            providerMetadata?: unknown;
          }) => ({
            variantId: variant.variantId.trim(),
            externalId: typeof variant.externalId === "string" ? variant.externalId.trim() : null,
            providerMetadata:
              variant.providerMetadata &&
              typeof variant.providerMetadata === "object" &&
              !Array.isArray(variant.providerMetadata)
                ? (variant.providerMetadata as Record<string, unknown>)
                : {},
          }),
        ),
      },
    } satisfies FlipkartAdapterPayload;

    const result = await prepareCommerceProviderDraft("flipkart", {
      context: { channelId, userId },
      payload,
    });

    if (result.status === "failed" && result.error) {
      const status =
        result.error.code === "CHANNEL_NOT_FOUND" ? 404 :
        result.error.code === "INVALID_PROVIDER" ? 409 : 400;
      return NextResponse.json({ success: false, error: result.error.code }, { status });
    }

    return NextResponse.json({
      success: true,
      listing: result.data && typeof result.data === "object"
        ? (result.data as { listing?: unknown }).listing
        : undefined,
      mapping: result.data && typeof result.data === "object"
        ? (result.data as { mapping?: unknown }).mapping
        : undefined,
      publishReady: result.data && typeof result.data === "object"
        ? (result.data as { publishReady?: unknown }).publishReady
        : undefined,
    });
  } catch (error) {
    console.error("POST /api/commerce/flipkart/draft error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
