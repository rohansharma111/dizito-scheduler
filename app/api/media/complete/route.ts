import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { mediaService } from "@/lib/media/service";
import { getUploadPolicy } from "@/lib/media/upload-policy";
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

    const rateLimit = await consumeRateLimit({ bucket: "media:upload-complete", identifier: `user:${userId}`, limit: 30, windowSeconds: 60 });
    if (!rateLimit.allowed) return NextResponse.json({ success: false, error: "Too many upload completion requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("publicId" in body) || typeof body.publicId !== "string" || !("fileName" in body) || typeof body.fileName !== "string" || !("mimeType" in body) || typeof body.mimeType !== "string") {
      return NextResponse.json({ success: false, error: "publicId, fileName and mimeType are required" }, { status: 400 });
    }

    const publicId = body.publicId.trim();
    const fileName = body.fileName.trim();
    const mimeType = body.mimeType.trim().toLowerCase();
    if (!publicId || publicId.length > 500 || !fileName || fileName.length > 255 || !mimeType || mimeType.length > 100) {
      return NextResponse.json({ success: false, error: "Invalid media completion details" }, { status: 400 });
    }

    const expectedPrefix = `users/${userId}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return NextResponse.json({ success: false, error: "Invalid media ownership" }, { status: 403 });
    }

    const resourceType = mimeType.startsWith("video/") ? "video" : "image";
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: "upload",
    });

    const resourceFormat = String(resource.format ?? "").toLowerCase();
    const allowedFormats =
      resourceType === "video"
        ? new Set(["mp4", "mov", "m4v"])
        : new Set(["jpg", "jpeg", "png", "webp"]);

    if (!allowedFormats.has(resourceFormat)) {
      return NextResponse.json(
        { success: false, error: "Uploaded media format is not supported" },
        { status: 400 },
      );
    }

    const policy = getUploadPolicy(mimeType, Number(resource.bytes ?? 0));
    if (!policy.allowed || policy.resourceType !== resourceType) {
      return NextResponse.json(
        { success: false, error: policy.allowed ? "Uploaded media type mismatch" : policy.error },
        { status: 400 },
      );
    }

    const media = await mediaService.completeDirectUpload({
      userId,
      publicId,
      fileName,
      mimeType,
      uploadProtocol: "cloudinary_signed_direct",
      resource,
    });

    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error) {
    console.error("Media completion failed:", error);
    return NextResponse.json(
      { success: false, error: "Unable to finalize media. Please verify the upload and try again." },
      { status: 400 },
    );
  }
}
