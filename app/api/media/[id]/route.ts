import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 401 });
    }

    const { id: rawId } = await params;
    if (!/^\\d+$/.test(rawId)) {
      return NextResponse.json({ success: false, error: "Invalid media ID" }, { status: 400 });
    }
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "Invalid media ID" }, { status: 400 });
    }

    const deleted = await mediaService.deleteMedia(id, userId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media deletion failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to delete this media. Please try again." },
      { status: 500 },
    );
  }
}
