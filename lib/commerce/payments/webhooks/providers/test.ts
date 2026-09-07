import crypto from "crypto";
import { CommerceWebhookAdapter, NormalizedWebhookEvent } from "../types";

const TEST_WEBHOOK_SECRET = "dizito-test-webhook-secret";

export const testWebhookAdapter: CommerceWebhookAdapter = {
  provider: "test",

  verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  },

  async normalizeEvent(payload: unknown): Promise<NormalizedWebhookEvent> {
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Invalid webhook payload");
    }

    const data = payload as Record<string, unknown>;

    if (typeof data.event_id !== "string") {
      throw new Error("Missing event_id");
    }

    if (typeof data.event_type !== "string") {
      throw new Error("Missing event_type");
    }

    const supportedEventTypes = [
      "payment.succeeded",
      "payment.failed",
      "payment.cancelled",
      "refund.succeeded",
      "refund.failed",
    ] as const;

    if (
      !supportedEventTypes.includes(
        data.event_type as (typeof supportedEventTypes)[number],
      )
    ) {
      throw new Error(`Unsupported webhook event type: ${data.event_type}`);
    }

    const paymentId =
      data.payment_id !== undefined ? Number(data.payment_id) : undefined;

    const refundId =
      data.refund_id !== undefined ? Number(data.refund_id) : undefined;

    return {
      provider: "test",
      providerEventId: data.event_id,
      eventType: data.event_type as NormalizedWebhookEvent["eventType"],
      paymentId,
      refundId,
      payload,
    };
  },
};
