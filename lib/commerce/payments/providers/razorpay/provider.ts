import {
  CreatePaymentInput,
  CreateRefundInput,
  PaymentResult,
  RefundResult,
} from "@/lib/commerce/payments/types";

import { createRazorpayOrder, createRazorpayRefund } from "./client";

import type { CommercePaymentProvider } from "../types";

export const razorpayCommerceProvider: CommercePaymentProvider = {
  name: "razorpay",

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    try {
      const order = await createRazorpayOrder({
        amount: input.amount,
        currency: input.currency,
        receipt: `dizito-${input.orderId}-${input.idempotencyKey}`,
      });

      return {
        success: true,
        provider: "razorpay",
        providerOrderId: order.id,
        status: "pending",
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      return {
        success: false,
        provider: "razorpay",
        status: "failed",
        amount: input.amount,
        currency: input.currency,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Razorpay order",
      };
    }
  },

  async createRefund(input: CreateRefundInput): Promise<RefundResult> {
    /*
     * Refund integration will be connected after
     * we resolve the Dizito payment ID to the
     * stored Razorpay payment ID.
     */
    throw new Error(
      "Razorpay Commerce refund integration is not connected yet",
    );
  },
};
