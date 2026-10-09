import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";
import { getUploadPolicy } from "@/lib/media/upload-policy";
import { matchesDeclaredMediaType } from "@/lib/security/media-signature";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid user session" }, { status: 401 });
    }

    const rateLimit = await consumeRateLimit({
      bucket: "media:upload",
      identifier: `user:${session.user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many upload requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: "File is empty" }, { status: 400 });
    }

    const policy = getUploadPolicy(file.type, file.size);
    if (!policy.allowed) {
      return NextResponse.json({ success: false, error: policy.error }, { status: 413 });
    }
    if (policy.resourceType === "video") {
      return NextResponse.json(
        { success: false, error: "Video uploads must use the signed direct Cloudinary upload flow.", code: "DIRECT_UPLOAD_REQUIRED" },
        { status: 409 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesDeclaredMediaType(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: "Uploaded file content does not match its declared media type" },
        { status: 415 },
      );
    }

    const media = await mediaService.uploadMedia({
      userId,
      buffer,
      fileName: file.name,
      mimeType: file.type,
    });
    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error) {
    console.error("Media upload failed:", error);
    return NextResponse.json(
      { success: false, error: "Media upload failed. Please check the file and try again." },
      { status: 500 },
    );
  }
}
