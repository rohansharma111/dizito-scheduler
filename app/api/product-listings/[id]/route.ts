import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProductListingById,
  updateProductListing,
} from "@/lib/commerce/listings/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  return Number.isInteger(userId) ? userId : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getUserId();
  if (userId === null) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const listing = await getProductListingById(id, userId);

  if (!listing) {
    return NextResponse.json({ error: "LISTING_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getUserId();
  if (userId === null) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (body?.status !== undefined && !["draft", "active", "paused", "archived"].includes(body.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const result = await updateProductListing(id, userId, {
    status: body?.status,
  });

  if (result.error === "LISTING_NOT_FOUND") {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ listing: result.listing });
}
