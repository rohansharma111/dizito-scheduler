import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { aiService } from "@/lib/ai/service";
import { pool } from "@/lib/db";
import { getCurrentUsage } from "@/lib/usage/getCurrentUsage";
import { incrementAIImagesGenerated } from "@/lib/usage/incrementAIImagesGenerated";
import { getPlan, canGenerateAIImage } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const ALLOWED_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024"]);
const ALLOWED_QUALITIES = new Set(["low", "medium", "high"]);
const MAX_PROMPT_LENGTH = 4000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
      bucket: "ai:image",
      identifier: `user:${session.user.id}`,
      limit: 10,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many AI image requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ success: false, error: "Prompt is required." }, { status: 400 });
    }
    const prompt = body.prompt.trim();
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.` }, { status: 400 });
    }
    if (body.size !== undefined && (typeof body.size !== "string" || !ALLOWED_SIZES.has(body.size))) {
      return NextResponse.json({ success: false, error: "Choose a supported image size." }, { status: 400 });
    }
    if (body.quality !== undefined && (typeof body.quality !== "string" || !ALLOWED_QUALITIES.has(body.quality))) {
      return NextResponse.json({ success: false, error: "Choose a supported image quality." }, { status: 400 });
    }

    const userResult = await pool.query("SELECT plan FROM users WHERE id = $1", [userId]);
    const userPlan = userResult.rows[0]?.plan ?? "free";
    const plan = getPlan(userPlan);
    const usage = await getCurrentUsage(userId);

    if (!canGenerateAIImage(userPlan, usage.ai_images_generated)) {
      return NextResponse.json(
        { success: false, error: `Your ${plan.name} plan allows only ${plan.aiImages} AI image generations per month. Please upgrade your plan.` },
        { status: 403 },
      );
    }

    const media = await aiService.generateImage({
      userId,
      prompt,
      size: body.size as "1024x1024" | "1024x1536" | "1536x1024" | undefined,
      quality: body.quality as "low" | "medium" | "high" | undefined,
    });

    await incrementAIImagesGenerated(userId);
    return NextResponse.json({ success: true, media }, { status: 201 });
  } catch (error) {
    console.error("AI image generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Image generation failed. Please try again." },
      { status: 500 },
    );
  }
}
