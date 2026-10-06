import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateProductListing } from "@/lib/commerce/listings/service";

const LISTING_STATUSES = new Set(["draft", "active", "paused", "archived"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (typeof status !== "string" || !LISTING_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid listing status" },
        { status: 400 },
      );
    }

    const result = await updateProductListing(id, userId, {
      status: status as "draft" | "active" | "paused" | "archived",
    });
    if (result.error === "LISTING_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, listing: result.listing });
  } catch (error) {
    console.error("PATCH /api/commerce/listings/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
