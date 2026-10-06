import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishCommerceProvider } from "@/lib/commerce/providers/service";
import type { FlipkartAdapterPayload } from "@/lib/platforms/flipkart/adapter";

export function getFlipkartPublishErrorStatus(error: string) {
  if (error === "CHANNEL_NOT_FOUND" || error === "LISTING_NOT_FOUND") return 404;
  if (
    error === "LISTING_ALREADY_PUBLISHED" ||
    error === "LISTING_IDEMPOTENCY_KEY_MISMATCH" ||
    error === "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION"
  ) return 409;
  if (error === "LIVE_PUBLISH_DISABLED") return 409;
  return 400;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
    const idempotencyKey =
      typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    const listing = body?.listing;

    if (
      !channelId ||
      !listingId ||
      !idempotencyKey ||
      body?.confirmLivePublish !== true ||
      !listing ||
      typeof listing !== "object" ||
      Array.isArray(listing)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "channelId, listingId, idempotencyKey, confirmLivePublish=true, and an object listing are required",
        },
        { status: 400 },
      );
    }

    const payload = {
      action: "publish",
      input: {
        channelId,
        listingId,
        idempotencyKey,
        listing,
      },
    } satisfies FlipkartAdapterPayload;

    const result = await publishCommerceProvider("flipkart", {
      context: { channelId, userId: Number(session.user.id) },
      payload,
      confirmLivePublish: true,
      idempotencyKey,
    });

    if (result.status === "failed" && result.error) {
      return NextResponse.json(
        { success: false, error: result.error.code },
        { status: getFlipkartPublishErrorStatus(result.error.code) },
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      result: result.data,
      externalId: result.externalId,
      error: result.error,
    });
  } catch (error) {
    console.error("POST /api/commerce/flipkart/publish error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to publish Flipkart listing" },
      { status: 400 },
    );
  }
}
