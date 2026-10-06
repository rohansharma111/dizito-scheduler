import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  requireCommerceProviderAdapter,
} from "@/lib/commerce/providers/service";
import type { WooCommerceAdapterPayload } from "@/lib/platforms/woocommerce/adapter";

export function getWooCommercePublishErrorStatus(error: string) {
  if (error === "CHANNEL_NOT_FOUND" || error === "LISTING_NOT_FOUND") return 404;
  if (
    error === "LISTING_ALREADY_PUBLISHED" ||
    error === "LISTING_IDEMPOTENCY_KEY_MISMATCH" ||
    error === "PUBLISH_ATTEMPT_REQUIRES_RECONCILIATION"
  ) return 409;
  return 400;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    const payload = body.payload;

    if (
      !channelId ||
      !listingId ||
      !idempotencyKey ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "channelId, listingId, idempotencyKey, and an object payload are required",
        },
        { status: 400 },
      );
    }

    const adapter = requireCommerceProviderAdapter("woocommerce");
    const result = await adapter.publish({
      context: {
        channelId,
        userId: Number(session.user.id),
      },
      payload: {
        action: "publish",
        input: {
          channelId,
          listingId,
          payload: payload as Record<string, unknown>,
          confirmLivePublish: true,
          idempotencyKey,
        },
      } satisfies WooCommerceAdapterPayload extends infer P ? P : never,
      confirmLivePublish: true,
      idempotencyKey,
    });

    if (result.status === "failed" && result.error) {
      return NextResponse.json(
        { success: false, error: result.error.code },
        { status: getWooCommercePublishErrorStatus(result.error.code) },
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: result.data,
        externalId: result.externalId,
        idempotentReplay:
          Boolean(result.data) &&
          typeof result.data === "object" &&
          "idempotentReplay" in result.data &&
          Boolean((result.data as { idempotentReplay?: unknown }).idempotentReplay),
      },
      {
        status:
          result.data &&
          typeof result.data === "object" &&
          "idempotentReplay" in result.data &&
          Boolean((result.data as { idempotentReplay?: unknown }).idempotentReplay)
            ? 200
            : 201,
      },
    );
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/publish error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to publish WooCommerce product",
      },
      { status: 400 },
    );
  }
}
