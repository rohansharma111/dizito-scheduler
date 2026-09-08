import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProductListingVariants,
  upsertProductListingVariant,
} from "@/lib/commerce/listings/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const variants = await getProductListingVariants(id, userId);
  return NextResponse.json({ variants });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body?.variantId) {
    return NextResponse.json({ error: "VARIANT_ID_REQUIRED" }, { status: 400 });
  }

  if (
    body.syncStatus !== undefined &&
    !["pending", "syncing", "synced", "error"].includes(body.syncStatus)
  ) {
    return NextResponse.json({ error: "INVALID_SYNC_STATUS" }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await upsertProductListingVariant(id, userId, {
    variantId: String(body.variantId),
    externalId: body.externalId ?? null,
    syncStatus: body.syncStatus,
    providerMetadata: body.providerMetadata,
  });

  if (result.error === "LISTING_NOT_FOUND" || result.error === "VARIANT_NOT_FOUND") {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ listingVariant: result.listingVariant });
}
