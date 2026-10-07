import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { mediaService } from "@/lib/media/service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      publicId?: string;
      fileName?: string;
      mimeType?: string;
    };

    const userId = Number(session.user.id);
    const publicId = body.publicId?.trim();
    if (!publicId || !body.fileName || !body.mimeType) {
      return NextResponse.json({ success: false, error: "publicId, fileName and mimeType are required" }, { status: 400 });
    }

    const expectedPrefix = `users/${userId}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return NextResponse.json({ success: false, error: "Invalid media ownership" }, { status: 403 });
    }

    const resourceType = body.mimeType.startsWith("video/") ? "video" : "image";
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: "upload",
    });

    const media = await mediaService.completeDirectUpload({
      userId,
      publicId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      uploadProtocol: "cloudinary_signed_direct",
      resource,
    });

    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error) {
    console.error("Media completion failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to finalize media" },
      { status: 400 },
    );
  }
}
