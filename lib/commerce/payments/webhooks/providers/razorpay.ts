import crypto from "crypto";
import { pool } from "@/lib/db";
import type {
  CommerceWebhookAdapter,
  NormalizedWebhookEvent,
  CommerceWebhookEventType,
} from "../types";

function getWebhookSecret() {
  const secret = process.env.COMMERCE_RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Commerce Razorpay webhook secret is not configured");
  }

  return secret;
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNestedObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getPaymentEntity(
  payload: unknown,
): Record<string, unknown> | undefined {
  const root = getNestedObject(payload);
  const payment = getNestedObject(root?.payment);
  return getNestedObject(payment?.entity);
}

function getRefundEntity(
  payload: unknown,
): Record<string, unknown> | undefined {
  const root = getNestedObject(payload);
  const refund = getNestedObject(root?.refund);
  return getNestedObject(refund?.entity);
}

function getOrderEntity(payload: unknown): Record<string, unknown> | undefined {
  const root = getNestedObject(payload);
  const order = getNestedObject(root?.order);
  return getNestedObject(order?.entity);
}

async function findInternalPaymentId(
  paymentProviderId?: string,
  providerOrderId?: string,
): Promise<number | undefined> {
  if (paymentProviderId) {
    const result = await pool.query(
      `
        SELECT id
        FROM order_payments
        WHERE provider = 'razorpay'
          AND transaction_id = $1
        LIMIT 1
      `,
      [paymentProviderId],
    );

    if (result.rows[0]) {
      return Number(result.rows[0].id);
    }
  }

  if (providerOrderId) {
    const result = await pool.query(
      `
        SELECT id
        FROM order_payments
        WHERE provider = 'razorpay'
          AND provider_order_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [providerOrderId],
    );

    if (result.rows[0]) {
      return Number(result.rows[0].id);
    }
  }

  return undefined;
}

async function findInternalRefundId(
  providerRefundId?: string,
): Promise<number | undefined> {
  if (!providerRefundId) {
    return undefined;
  }

  const result = await pool.query(
    `
      SELECT id
      FROM order_refunds
      WHERE provider = 'razorpay'
        AND provider_refund_id = $1
      LIMIT 1
    `,
    [providerRefundId],
  );

  if (result.rows[0]) {
    return Number(result.rows[0].id);
  }

  return undefined;
}

function mapEventType(eventName: string): CommerceWebhookEventType | undefined {
  switch (eventName) {
    case "payment.authorized":
      return "payment.authorized";

    case "payment.captured":
      return "payment.captured";

    case "payment.failed":
      return "payment.failed";

    case "order.paid":
      return "order.paid";

    case "refund.processed":
      return "refund.processed";

    case "refund.failed":
      return "refund.failed";

    default:
      return undefined;
  }
}

export const razorpayCommerceWebhookAdapter: CommerceWebhookAdapter = {
  provider: "razorpay",

  verifySignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", getWebhookSecret())
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    const receivedBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  },

  async normalizeEvent(payload: unknown): Promise<NormalizedWebhookEvent> {
    const root = getNestedObject(payload);

    if (!root) {
      throw new Error("Invalid Razorpay webhook payload");
    }

    const eventName = getStringValue(root.event);

    if (!eventName) {
      throw new Error("Razorpay webhook event name is missing");
    }

    const eventType = mapEventType(eventName);

    if (!eventType) {
      throw new Error(`Unsupported Razorpay webhook event: ${eventName}`);
    }

    const paymentEntity = getPaymentEntity(root.payload);

    const refundEntity = getRefundEntity(root.payload);

    const orderEntity = getOrderEntity(root.payload);

    const razorpayPaymentId = getStringValue(paymentEntity?.id);

    const razorpayOrderId =
      getStringValue(paymentEntity?.order_id) ??
      getStringValue(orderEntity?.id);

    const razorpayRefundId = getStringValue(refundEntity?.id);

    const paymentId = await findInternalPaymentId(
      razorpayPaymentId,
      razorpayOrderId,
    );

    const refundId = await findInternalRefundId(razorpayRefundId);

    return {
      provider: "razorpay",
      providerEventId: "",
      eventType,
      paymentId,
      refundId,
      payload,
    };
  },
};
