import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { reconcileWooCommercePublish } from "@/lib/platforms/woocommerce/reconcile";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

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
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
  const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const externalId = typeof body?.externalId === "string" ? body.externalId.trim() : "";
  const sku = typeof body?.sku === "string" ? body.sku.trim() : "";

  if (!channelId || !listingId || !idempotencyKey || (!externalId && !sku)) {
    return NextResponse.json({ error: "channelId, listingId, idempotencyKey, and either externalId or sku are required" }, { status: 400 });
  }

  const result = await reconcileWooCommercePublish(Number(session.user.id), {
    channelId,
    listingId,
    idempotencyKey,
    externalId: externalId || undefined,
    sku: sku || undefined,
  });
  if ("error" in result) {
    const status = result.error === "RECONCILIATION_IDENTIFIER_REQUIRED" ? 400
      : result.error === "CHANNEL_NOT_FOUND" || result.error === "LISTING_NOT_FOUND" || result.error === "PUBLISH_ATTEMPT_NOT_FOUND" ? 404
      : result.error === "PUBLISH_ATTEMPT_ALREADY_RECONCILED" || result.error === "PUBLISH_ATTEMPT_NOT_RECONCILABLE" || result.error === "LISTING_IDEMPOTENCY_KEY_MISMATCH" ? 409
      : result.error === "PROVIDER_PRODUCT_NOT_FOUND" || result.error === "PROVIDER_SKU_MISMATCH" || result.error === "MULTIPLE_PROVIDER_PRODUCTS_FOUND" ? 422
      : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
