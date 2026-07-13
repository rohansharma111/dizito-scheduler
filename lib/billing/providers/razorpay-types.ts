export type RazorpaySubscriptionEntity = {
  id: string;

  customer_id: string | null;

  plan_id: string;

  status:
    | "created"
    | "authenticated"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired";

  current_start: number | null;

  current_end: number | null;

  charge_at: number | null;

  start_at: number | null;

  end_at: number | null;

  total_count: number;

  paid_count: number;

  remaining_count: number;

  notes: Record<string, string>;
};

export type RazorpayWebhookPayload = {
  event: string;

  payload: {
    subscription: {
      entity: RazorpaySubscriptionEntity;
    };
  };
};
