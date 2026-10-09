import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";
import { getUploadPolicy, IMAGE_MAX_BYTES } from "@/lib/media/upload-policy";
import { matchesDeclaredMediaType } from "@/lib/security/media-signature";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { readRequestBodyWithLimit } from "@/lib/security/request-body";

// Multipart framing and per-part headers need room beyond the 25 MiB image payload.
const MAX_MULTIPART_BODY_BYTES = IMAGE_MAX_BYTES + 1024 * 1024;

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

    // Reject obviously oversized declared bodies before multipart parsing allocates buffers.
    // Defense in depth only: requests without Content-Length still need an upstream/runtime
    // body-size limit because chunked bodies can bypass this check.
    const contentLength = request.headers.get("content-length");
    if (contentLength !== null) {
      if (!/^\d+$/.test(contentLength)) {
        return NextResponse.json({ success: false, error: "Invalid Content-Length header" }, { status: 400 });
      }
      const declaredLength = Number(contentLength);
      if (!Number.isSafeInteger(declaredLength)) {
        return NextResponse.json({ success: false, error: "Invalid Content-Length header" }, { status: 400 });
      }
      if (declaredLength > MAX_MULTIPART_BODY_BYTES) {
        return NextResponse.json(
          { success: false, error: "Upload request exceeds the maximum request size. Use signed direct upload for large media." },
          { status: 413 },
        );
      }
    }

    // Enforce the same cap on streamed requests that omit Content-Length.
    const boundedBody = await readRequestBodyWithLimit(request, MAX_MULTIPART_BODY_BYTES);
    if (!boundedBody.ok) {
      return NextResponse.json(
        { success: false, error: "Upload request exceeds the maximum request size. Use signed direct upload for large media." },
        { status: 413 },
      );
    }

    // Parse only after the complete body has passed the hard byte limit. Remove a potentially
    // stale Content-Length header because the body is now represented by a bounded byte array.
    const boundedHeaders = new Headers(request.headers);
    boundedHeaders.delete("content-length");
    let formData: FormData;
    try {
      const boundedRequest = new Request(request.url, {
        method: "POST",
        headers: boundedHeaders,
        body: boundedBody.body,
      });
      formData = await boundedRequest.formData();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid multipart upload request" }, { status: 400 });
    }
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
