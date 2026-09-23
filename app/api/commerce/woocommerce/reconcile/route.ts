import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reconcileWooCommercePublish } from "@/lib/platforms/woocommerce/reconcile";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const channelId = typeof body?.channelId === "string" ? body.channelId.trim() : "";
  const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const externalId = typeof body?.externalId === "string" ? body.externalId.trim() : "";

  if (!channelId || !listingId || !idempotencyKey || !externalId) {
    return NextResponse.json({ error: "channelId, listingId, idempotencyKey, and externalId are required" }, { status: 400 });
  }

  const result = await reconcileWooCommercePublish(Number(session.user.id), {
    channelId,
    listingId,
    idempotencyKey,
    externalId,
  });
  if ("error" in result) {
    const status = result.error === "CHANNEL_NOT_FOUND" || result.error === "LISTING_NOT_FOUND" || result.error === "PUBLISH_ATTEMPT_NOT_FOUND" ? 404
      : result.error === "PUBLISH_ATTEMPT_ALREADY_RECONCILED" ? 409
      : result.error === "PROVIDER_PRODUCT_NOT_FOUND" ? 422
      : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
