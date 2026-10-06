import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateCommerceChannel } from "@/lib/commerce/channels/service";

const CHANNEL_STATUSES = new Set(["active", "inactive"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = userId;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (typeof status !== "string" || !CHANNEL_STATUSES.has(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel status" },
        { status: 400 },
      );
    }

    const channel = await updateCommerceChannel(id, userId, {
      status: status as "active" | "inactive",
    });

    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    console.error("PATCH /api/commerce/channels/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
