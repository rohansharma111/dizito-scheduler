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
     * Commerce currently uses Razorpay as the real payment provider.
     *
     * Provider selection is intentionally server-controlled.
     * We do not trust a provider value supplied by the request.
     */
    const provider = "razorpay";

    const adapter = getCommerceWebhookAdapter(provider);

    /*
     * IMPORTANT:
     *
     * Razorpay calculates its webhook signature against the exact
     * raw request body. Do not parse JSON before verification.
     */
    const rawBody = await request.text();

    /*
     * Razorpay webhook signature.
     */
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        {
          error: "Missing Razorpay webhook signature",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Verify the signature before trusting the payload.
     */
    const validSignature = adapter.verifySignature(rawBody, signature);

    if (!validSignature) {
      return NextResponse.json(
        {
          error: "Invalid Razorpay webhook signature",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Razorpay provides a unique event ID in the request header.
     *
     * We persist this in payment_webhook_events.provider_event_id
     * so duplicate webhook deliveries are handled idempotently.
     */
    const providerEventId = request.headers.get("x-razorpay-event-id");

    if (!providerEventId) {
      return NextResponse.json(
        {
          error: "Missing Razorpay webhook event ID",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Parse JSON only AFTER signature verification.
     */
    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON payload",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Convert the Razorpay-specific payload into
     * Dizito's normalized webhook representation.
     */
    const normalized = await adapter.normalizeEvent(payload);

    /*
     * The Razorpay adapter resolves payment/refund IDs,
     * while the route supplies the trusted event ID from
     * Razorpay's HTTP header.
     */
    const event = await createWebhookEvent({
      provider: normalized.provider,
      providerEventId,
      eventType: normalized.eventType,
      paymentId: normalized.paymentId,
      refundId: normalized.refundId,
      providerPaymentId: normalized.providerPaymentId,
      providerRefundId: normalized.providerRefundId,
      payload: normalized.payload,
    });

    webhookEventId = Number(event.id);

    /*
     * Process the normalized event.
     *
     * processWebhookEvent() is itself idempotent:
     * already-processed events are safely ignored.
     */
    const result = await processWebhookEvent(webhookEventId);

    return NextResponse.json({
      success: true,
      event: result.event,
      alreadyProcessed: result.alreadyProcessed ?? false,
    });
  } catch (error) {
    console.error("Commerce Razorpay webhook error:", error);

    /*
     * If the webhook event was persisted but processing
     * subsequently failed, mark the event as failed.
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
      {
        status: 400,
      },
    );
  }
}
