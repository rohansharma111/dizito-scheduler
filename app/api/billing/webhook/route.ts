import { pool } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/billing/webhooks/verify";
import { RazorpayWebhookPayload } from "@/lib/billing/providers/razorpay-types";
import { getBillingPlanByProviderPlanId } from "@/lib/billing/provider-mapping";
import { BillingRepository } from "@/lib/billing/repository";
import { failPayment } from "@/lib/billing/lifecycle/failPayment";
import { mapRazorpaySubscriptionStatus } from "@/lib/billing/state";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

    const rawBody = await request.text();
    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const event = payload.event;
    const providerEventId = payload.id;

    if (!providerEventId) {
      return Response.json({ error: "Missing provider event id" }, { status: 400 });
    }

    const inserted = await pool.query(
      `INSERT INTO billing_webhook_events
        (provider, provider_event_id, event_type, provider_subscription_id, payload)
       VALUES ('razorpay', $1, $2, $3, $4)
       ON CONFLICT (provider, provider_event_id) DO NOTHING
       RETURNING id`,
      [
        providerEventId,
        event,
        payload.payload.subscription?.entity.id ?? null,
        payload,
      ],
    );

    if (!inserted.rows[0]) {
      return Response.json({ success: true, duplicate: true });
    }

    try {
      if (event === "payment.failed") {
        await failPayment(payload);
      } else {
        const entity = payload.payload.subscription?.entity;
        if (!entity) throw new Error(`Missing subscription entity for ${event}`);

        const subscription = await BillingRepository.getSubscriptionByProviderId(entity.id);
        if (!subscription) throw new Error("Subscription not found");

        const mappedPlan = await getBillingPlanByProviderPlanId("razorpay", entity.plan_id);
        const gracePeriodUntil =
          event === "subscription.halted"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : null;

        await BillingRepository.updateSubscription(entity.id, {
          status: mapRazorpaySubscriptionStatus(event),
          providerCustomerId: entity.customer_id,
          currentPeriodStart: entity.current_start ? new Date(entity.current_start * 1000) : null,
          currentPeriodEnd: entity.current_end ? new Date(entity.current_end * 1000) : null,
          trialStartAt: entity.start_at ? new Date(entity.start_at * 1000) : null,
          trialEndAt: entity.charge_at ? new Date(entity.charge_at * 1000) : null,
          endedAt: entity.end_at ? new Date(entity.end_at * 1000) : null,
          gracePeriodUntil,
          billingPlanId: mappedPlan?.id ?? subscription.billing_plan_id,
          plan: mappedPlan?.code ?? subscription.plan,
          cancelAtPeriodEnd: event === "subscription.cancelled" ? false : undefined,
          metadata: payload,
        });
      }

      await pool.query(
        `UPDATE billing_webhook_events
         SET status = 'processed', processed_at = NOW()
         WHERE id = $1`,
        [inserted.rows[0].id],
      );

      return Response.json({ success: true });
    } catch (error) {
      await pool.query(
        `UPDATE billing_webhook_events
         SET status = 'failed', error_message = $2
         WHERE id = $1`,
        [inserted.rows[0].id, error instanceof Error ? error.message : String(error)],
      );
      throw error;
    }
  } catch (error) {
    console.error("BILLING WEBHOOK ERROR", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
