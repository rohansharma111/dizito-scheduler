import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { aiService } from "@/lib/ai/service";

import { pool } from "@/lib/db";

import { getCurrentUsage } from "@/lib/usage/getCurrentUsage";
import { incrementAIImagesGenerated } from "@/lib/usage/incrementAIImagesGenerated";

import { getPlan, canGenerateAIImage } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const rateLimit = await consumeRateLimit({ bucket: "ai:image", identifier: `user:${session.user.id}`, limit: 10, windowSeconds: 60 });
    if (!rateLimit.allowed) return NextResponse.json({ success: false, error: "Too many AI image requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000))) } });

    const body = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required",
        },
        {
          status: 400,
        },
      );
    }

    const userId = Number(session.user.id);

    /*
      Load user plan
    */

    const userResult = await pool.query(
      `
      SELECT plan
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    const userPlan = userResult.rows[0]?.plan ?? "free";

    const plan = getPlan(userPlan);

    /*
      Current usage
    */

    const usage = await getCurrentUsage(userId);

    /*
      Plan guard
    */

    if (!canGenerateAIImage(userPlan, usage.ai_images_generated)) {
      return NextResponse.json(
        {
          success: false,

          error: `Your ${plan.name} plan allows only ${plan.aiImages} AI image generations per month. Please upgrade your plan.`,
        },
        {
          status: 403,
        },
      );
    }

    /*
      Generate image
    */

    const media = await aiService.generateImage({
      userId,

      prompt: body.prompt,

      size: body.size,

      quality: body.quality,
    });

    /*
      Increment usage
    */

    await incrementAIImagesGenerated(userId);

    return NextResponse.json(
      {
        success: true,

        media,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      {
        status: 500,
      },
    );
  }
}
