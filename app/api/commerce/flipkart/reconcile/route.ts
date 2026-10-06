import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reconcileCommerceProvider } from "@/lib/commerce/providers/service";
import type { FlipkartAdapterPayload } from "@/lib/platforms/flipkart/adapter";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
    const operationId = typeof body?.operationId === "string" ? body.operationId.trim() : "";
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
    const externalId = typeof body?.externalId === "string" ? body.externalId.trim() : "";
    const lookupKey = typeof body?.lookupKey === "string" ? body.lookupKey.trim() : "";
    const skuIds = Array.isArray(body?.skuIds)
      ? body.skuIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0).map((value: string) => value.trim())
      : [];

    if (!channelId || !operationId || !listingId || (!lookupKey && skuIds.length === 0)) {
      return NextResponse.json(
        {
          error:
            "channelId, operationId, listingId, and at least one of lookupKey or skuIds are required",
        },
        { status: 400 },
      );
    }

    const payload = {
      action: "reconcile",
      input: {
        channelId,
        operationId,
        listingId,
        skuIds,
        externalId: externalId || undefined,
        lookupKey: lookupKey || undefined,
      },
    } satisfies FlipkartAdapterPayload;

    const result = await reconcileCommerceProvider("flipkart", {
      context: { channelId, userId },
      payload,
      externalId: externalId || undefined,
      lookupKey: lookupKey || undefined,
    });

    if (result.status === "failed" && result.error) {
      const status =
        result.error.code === "CHANNEL_NOT_FOUND" ? 404 :
        result.error.code === "PUBLISH_ATTEMPT_NOT_FOUND" ? 404 :
        result.error.code === "PUBLISH_ATTEMPT_NOT_RECONCILABLE" ? 409 :
        502;
      return NextResponse.json({ error: result.error.code }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/commerce/flipkart/reconcile error:", error);
    return NextResponse.json({ error: "RECONCILIATION_FAILED" }, { status: 502 });
  }
}
