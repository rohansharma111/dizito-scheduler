export type {
  CreatePaymentInput,
  CreateRefundInput,
  PaymentResult,
  RefundResult,
} from "../types";

import type {
  CreatePaymentInput,
  CreateRefundInput,
  PaymentResult,
  RefundResult,
} from "../types";

export interface CommercePaymentProvider {
  readonly name: string;

  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;

  createRefund(input: CreateRefundInput): Promise<RefundResult>;
}
