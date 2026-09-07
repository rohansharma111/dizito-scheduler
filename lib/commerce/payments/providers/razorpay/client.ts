import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function getCredentials() {
  const keyId = process.env.COMMERCE_RAZORPAY_KEY_ID;

  const keySecret = process.env.COMMERCE_RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Commerce Razorpay credentials are not configured");
  }

  return {
    keyId,
    keySecret,
  };
}

function getAuthHeader() {
  const { keyId, keySecret } = getCredentials();

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  return `Basic ${credentials}`;
}

async function razorpayRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.error?.description === "string"
        ? data.error.description
        : "Razorpay API request failed";

    throw new Error(message);
  }

  return data as T;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id?: string;
  method?: string;
  captured: boolean;
  description?: string;
  email?: string;
  contact?: string;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  status: "pending" | "processed" | "failed";
  created_at: number;
}

export interface CreateRazorpayOrderInput {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput,
): Promise<RazorpayOrder> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Razorpay order amount must be a positive integer");
  }

  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error("Razorpay order currency must be a valid ISO 4217 code");
  }

  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
}

export async function fetchRazorpayOrder(
  orderId: string,
): Promise<RazorpayOrder> {
  if (!orderId.trim()) {
    throw new Error("Razorpay order ID is required");
  }

  return razorpayRequest<RazorpayOrder>(
    `/orders/${encodeURIComponent(orderId)}`,
  );
}

export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayPayment> {
  if (!paymentId.trim()) {
    throw new Error("Razorpay payment ID is required");
  }

  return razorpayRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}`,
  );
}

export interface CreateRazorpayRefundInput {
  paymentId: string;
  amount: number;
  idempotencyKey: string;
  notes?: Record<string, string>;
}

export async function createRazorpayRefund(
  input: CreateRazorpayRefundInput,
): Promise<RazorpayRefund> {
  if (!input.paymentId.trim()) {
    throw new Error("Razorpay payment ID is required");
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Razorpay refund amount must be a positive integer");
  }

  const idempotencyKey = input.idempotencyKey.trim();

  if (idempotencyKey.length < 10) {
    throw new Error(
      "Razorpay refund idempotency key must be at least 10 characters",
    );
  }

  if (!/^[A-Za-z0-9_-]+$/.test(idempotencyKey)) {
    throw new Error(
      "Razorpay refund idempotency key may contain only letters, numbers, hyphens, and underscores",
    );
  }

  return razorpayRequest<RazorpayRefund>(
    `/payments/${encodeURIComponent(input.paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        "X-Refund-Idempotency": idempotencyKey,
      },
      body: JSON.stringify({
        amount: input.amount,
        notes: input.notes,
      }),
    },
  );
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const { keySecret } = getCredentials();

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);

  const providedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function fetchRazorpayRefund(
  refundId: string,
): Promise<RazorpayRefund> {
  if (!refundId.trim()) {
    throw new Error("Razorpay refund ID is required");
  }

  return razorpayRequest<RazorpayRefund>(
    `/refunds/${encodeURIComponent(refundId)}`,
  );
}
