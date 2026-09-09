import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCommerceChannelById } from "@/lib/commerce/channels/service";
import { verifyAmazonConnection } from "@/lib/platforms/amazon/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { channelId?: string };
    if (!body.channelId) return NextResponse.json({ success: false, error: "channelId is required" }, { status: 400 });

    const userId = Number(session.user.id);
    const channel = await getCommerceChannelById(body.channelId, userId);
    if (!channel || channel.provider !== "amazon") {
      return NextResponse.json({ success: false, error: "Amazon channel not found" }, { status: 404 });
    }

    const result = await verifyAmazonConnection(String(channel.id));
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Amazon connection verification failed" },
      { status: 502 },
    );
  }
}
