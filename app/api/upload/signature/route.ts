import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { getUploadPolicy } from "@/lib/media/upload-policy";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await consumeRateLimit({ bucket: "media:upload-signature", identifier: `user:${session.user.id}`, limit: 30, windowSeconds: 60 });
    if (!rateLimit.allowed) return NextResponse.json({ success: false, error: "Too many upload initialization requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });

    const body = (await request.json().catch(() => ({}))) as { mimeType?: string; size?: number };
    const policy = getUploadPolicy(body.mimeType ?? "", body.size ?? 0);

    if (!policy.allowed) {
      return NextResponse.json({ success: false, error: policy.error }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ success: false, error: "Cloudinary direct upload is not configured" }, { status: 503 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `users/${Number(session.user.id)}`;
    const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, process.env.CLOUDINARY_API_SECRET);

    return NextResponse.json({
      success: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
      resourceType: policy.resourceType,
      uploadProtocol: "cloudinary_signed_direct",
    });
  } catch (error) {
    console.error("Media upload signature failed:", error);
    return NextResponse.json({ success: false, error: "Unable to initialize direct upload" }, { status: 500 });
  }
}
