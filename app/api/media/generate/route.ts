import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { aiService } from "@/lib/ai/service";

import { pool } from "@/lib/db";

import { getCurrentUsage } from "@/lib/usage/getCurrentUsage";
import { incrementAIImagesGenerated } from "@/lib/usage/incrementAIImagesGenerated";

import { getPlan, canGenerateAIImage } from "@/lib/plans";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

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

    const rateLimit = await checkRateLimit(request, {
      scope: "ai-image-generation",
      limit: 10,
      windowSeconds: 60,
      userId,
    });
    const rateLimitError = rateLimitResponse(rateLimit);
    if (rateLimitError) return rateLimitError;

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
