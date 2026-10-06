import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { reconcileCommerceProvider } from "@/lib/commerce/providers/service";
import type { WooCommerceAdapterPayload } from "@/lib/platforms/woocommerce/adapter";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId")?.trim() ?? "";
    const listingId = url.searchParams.get("listingId")?.trim() ?? "";
    const idempotencyKey = url.searchParams.get("idempotencyKey")?.trim() ?? "";
    if (!channelId || !listingId || !idempotencyKey) {
      return NextResponse.json({ error: "channelId, listingId, and idempotencyKey are required" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT a.id, a.status, a.provider, a.idempotency_key, a.external_id,
              a.error_message, a.started_at, a.completed_at, a.updated_at,
              l.status AS listing_status, l.sync_status, l.last_error, l.external_id AS listing_external_id
       FROM commerce_publish_attempts a
       JOIN product_listings l ON l.id = a.listing_id
       WHERE a.channel_id = $1 AND a.listing_id = $2 AND a.idempotency_key = $3
         AND a.user_id = $4 AND l.user_id = $4
       LIMIT 1`,
      [channelId, listingId, idempotencyKey, Number(session.user.id)],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "PUBLISH_ATTEMPT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ attempt: result.rows[0] });
  } catch (error) {
    console.error("GET /api/commerce/woocommerce/reconcile error:", error);
    return NextResponse.json({ error: "RECONCILIATION_STATUS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
    const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    const externalId = typeof body?.externalId === "string" ? body.externalId.trim() : "";
    const sku = typeof body?.sku === "string" ? body.sku.trim() : "";

    if (!channelId || !listingId || !idempotencyKey || (!externalId && !sku)) {
      return NextResponse.json({ error: "channelId, listingId, idempotencyKey, and either externalId or sku are required" }, { status: 400 });
    }

    const payload = {
      action: "reconcile",
      input: {
        channelId,
        listingId,
        idempotencyKey,
        externalId: externalId || undefined,
        sku: sku || undefined,
      },
    } satisfies WooCommerceAdapterPayload;

    const result = await reconcileCommerceProvider("woocommerce", {
      context: { channelId, userId: Number(session.user.id) },
      payload,
      externalId: externalId || undefined,
      lookupKey: sku || undefined,
    });

    if (result.status === "failed" && result.error) {
      const status =
        result.error.code === "RECONCILIATION_IDENTIFIER_REQUIRED" ||
        result.error.code === "RECONCILIATION_IDENTITY_REQUIRED"
          ? 400
          : result.error.code === "CHANNEL_NOT_FOUND" ||
              result.error.code === "LISTING_NOT_FOUND" ||
              result.error.code === "PUBLISH_ATTEMPT_NOT_FOUND"
            ? 404
            : result.error.code === "PUBLISH_ATTEMPT_ALREADY_RECONCILED" ||
                result.error.code === "PUBLISH_ATTEMPT_NOT_RECONCILABLE" ||
                result.error.code === "LISTING_IDEMPOTENCY_KEY_MISMATCH"
              ? 409
              : result.error.code === "RECONCILIATION_SKU_MISMATCH" ||
                  result.error.code === "PROVIDER_PRODUCT_NOT_FOUND" ||
                  result.error.code === "PROVIDER_SKU_MISMATCH" ||
                  result.error.code === "MULTIPLE_PROVIDER_PRODUCTS_FOUND"
                ? 422
                : 502;
      return NextResponse.json({ error: result.error.code }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/reconcile error:", error);
    return NextResponse.json({ error: "RECONCILIATION_FAILED" }, { status: 502 });
  }
}
