import { NextResponse } from "next/server";
import { getCommerceWebhookAdapter } from "@/lib/commerce/payments/webhooks/registry";
import {
  createWebhookEvent,
  updateWebhookEventStatus,
} from "@/lib/commerce/payments/webhooks/service";
import { processWebhookEvent } from "@/lib/commerce/payments/webhooks/processor";

export async function POST(request: Request) {
  let webhookEventId: number | undefined;

  try {
    /*
     * Provider identification.
     *
     * For now the test adapter is selected explicitly.
     * Later this can come from the webhook URL or another
     * trusted provider-specific routing mechanism.
     */
    const provider = "test";

    const adapter = getCommerceWebhookAdapter(provider);

    /*
     * IMPORTANT:
     * Signature verification must use the exact raw body.
     */
    const rawBody = await request.text();

    const signature = request.headers.get("x-test-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 },
      );
    }

    const validSignature = adapter.verifySignature(rawBody, signature);

    if (!validSignature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    /*
     * Convert provider-specific payload into
     * Dizito's normalized webhook format.
     */
    const normalized = adapter.normalizeEvent(payload);

    /*
     * Persist the webhook event before processing it.
     */
    const event = await createWebhookEvent({
      provider: normalized.provider,
      providerEventId: normalized.providerEventId,
      eventType: normalized.eventType,
      paymentId: normalized.paymentId,
      refundId: normalized.refundId,
      payload: normalized.payload,
    });

    webhookEventId = Number(event.id);

    /*
     * Process the normalized event.
     */
    const result = await processWebhookEvent(webhookEventId);

    return NextResponse.json({
      success: true,
      event: result.event,
      alreadyProcessed: result.alreadyProcessed ?? false,
    });
  } catch (error) {
    console.error("Commerce payment webhook error:", error);

    /*
     * If the event was already persisted but processing
     * failed, make sure the event is marked failed.
     */
    if (webhookEventId) {
      try {
        await updateWebhookEventStatus(
          webhookEventId,
          "failed",
          error instanceof Error ? error.message : "Webhook processing failed",
        );
      } catch (statusError) {
        console.error("Failed to update webhook event status:", statusError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}
