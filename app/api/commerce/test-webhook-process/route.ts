import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processWebhookEvent } from "@/lib/commerce/payments/webhooks/processor";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const webhookEventId = Number(body.webhookEventId);

    if (!Number.isInteger(webhookEventId) || webhookEventId <= 0) {
      return NextResponse.json(
        { error: "Invalid webhookEventId" },
        { status: 400 },
      );
    }

    const result = await processWebhookEvent(webhookEventId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test webhook processing error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}
