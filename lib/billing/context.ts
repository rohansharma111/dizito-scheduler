import { SubscriptionRecord } from "./repository";
import {
  RazorpayWebhookPayload,
  RazorpaySubscriptionEntity,
} from "./providers/razorpay-types";

export type BillingContext = {
  subscription: SubscriptionRecord;

  webhook: RazorpayWebhookPayload;

  entity: RazorpaySubscriptionEntity;

  event: string;
};
