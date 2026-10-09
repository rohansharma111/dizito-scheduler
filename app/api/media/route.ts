import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 401 });
    }

    const media = await mediaService.listMedia(userId);
    return NextResponse.json({ success: true, media }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load your media library. Please try again." },
      { status: 500 },
    );
  }
}
