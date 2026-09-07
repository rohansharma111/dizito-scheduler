export type CommercePaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type CommerceRefundStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CommercePaymentMethod =
  | "card"
  | "upi"
  | "netbanking"
  | "wallet"
  | "bank_transfer"
  | "cod"
  | "other";

export interface CreatePaymentInput {
  orderId: number;
  amount: number;
  currency: string;
  paymentMethod?: CommercePaymentMethod | string;
  idempotencyKey: string;
}

export interface PaymentResult {
  success: boolean;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  status: CommercePaymentStatus;
  amount: number;
  currency: string;
  error?: string;
}

export interface CreateRefundInput {
  orderId: number;
  paymentId: number;
  amount: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  provider: string;
  providerRefundId?: string;
  status: CommerceRefundStatus;
  amount: number;
  currency: string;
  error?: string;
}
