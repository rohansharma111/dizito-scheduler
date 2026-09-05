import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createWebhookEvent,
  updateWebhookEventStatus,
} from "@/lib/commerce/payments/webhooks/service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      action,
      eventId,
      eventType,
      paymentId,
      refundId,
      payload,
      status,
      errorMessage,
    } = body;

    if (action === "create") {
      if (typeof eventId !== "string" || !eventId.trim()) {
        return NextResponse.json(
          { error: "eventId is required" },
          { status: 400 },
        );
      }

      if (typeof eventType !== "string" || !eventType.trim()) {
        return NextResponse.json(
          { error: "eventType is required" },
          { status: 400 },
        );
      }

      const event = await createWebhookEvent({
        provider: "test",
        providerEventId: eventId,
        eventType,
        paymentId: paymentId !== undefined ? Number(paymentId) : undefined,
        refundId: refundId !== undefined ? Number(refundId) : undefined,
        payload,
      });

      return NextResponse.json({
        success: true,
        event,
      });
    }

    if (action === "status") {
      const webhookEventId = Number(body.webhookEventId);

      if (!Number.isInteger(webhookEventId) || webhookEventId <= 0) {
        return NextResponse.json(
          { error: "Invalid webhookEventId" },
          { status: 400 },
        );
      }

      const event = await updateWebhookEventStatus(
        webhookEventId,
        status,
        errorMessage,
      );

      return NextResponse.json({
        success: true,
        event,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Test webhook event error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook event operation failed",
      },
      { status: 400 },
    );
  }
}
