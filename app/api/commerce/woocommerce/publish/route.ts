import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishWooCommerceProduct } from "@/lib/platforms/woocommerce/publish";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
    const payload = body.payload;
    const confirmLivePublish = body.confirmLivePublish;

    if (!channelId || !payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, error: "channelId and an object payload are required" },
        { status: 400 },
      );
    }

    const result = await publishWooCommerceProduct(Number(session.user.id), {
      channelId,
      payload: payload as Record<string, unknown>,
      confirmLivePublish,
    });

    if ("error" in result) {
      const status = result.error === "CHANNEL_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, result: result.result }, { status: 201 });
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/publish error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to publish WooCommerce product" },
      { status: 400 },
    );
  }
}
