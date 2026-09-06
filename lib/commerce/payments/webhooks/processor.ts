import { pool } from "@/lib/db";
import { transitionPaymentStatus } from "../state";
import { syncPaymentRefundStatus, markRefundFailed } from "../refund-state";
import { updateWebhookEventStatus } from "./service";

export async function processWebhookEvent(webhookEventId: number) {
  /*
   * First lock the webhook event and verify that it exists.
   */
  const client = await pool.connect();

  let event;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT
        id,
        provider,
        provider_event_id,
        event_type,
        payment_id,
        refund_id,
        status,
        payload
      FROM payment_webhook_events
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [webhookEventId],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new Error("Webhook event not found");
    }

    event = result.rows[0];

    /*
     * Already processed events are safely ignored.
     */
    if (event.status === "processed") {
      await client.query("COMMIT");

      return {
        success: true,
        alreadyProcessed: true,
        event,
      };
    }

    /*
     * Prevent processing an event that is already being processed.
     */
    if (event.status === "processing") {
      await client.query("COMMIT");

      return {
        success: false,
        alreadyProcessing: true,
        event,
      };
    }

    await client.query(
      `
      UPDATE payment_webhook_events
      SET
        status = 'processing',
        updated_at = NOW()
      WHERE id = $1::bigint
      `,
      [webhookEventId],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }

  client.release();

  try {
    /*
     * Process payment events.
     */
    if (event.event_type === "payment.succeeded") {
      if (!event.payment_id) {
        throw new Error("payment.succeeded webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "paid");
    } else if (event.event_type === "payment.failed") {
      if (!event.payment_id) {
        throw new Error("payment.failed webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "failed");
    } else if (event.event_type === "payment.cancelled") {
      if (!event.payment_id) {
        throw new Error("payment.cancelled webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "cancelled");
    } else if (event.event_type === "refund.succeeded") {
      /*
       * Process refund events.
       *
       * The refund record should already exist.
       * The webhook confirms its provider-side result.
       */
      if (!event.payment_id) {
        throw new Error("refund.succeeded webhook requires payment_id");
      }

      await syncPaymentRefundStatus(Number(event.payment_id));
    } else if (event.event_type === "refund.failed") {
      /*
       * A failed refund should not change the payment's
       * refunded amount because only successful refunds
       * are included in refund accounting.
       *
       * The refund record itself should be marked failed
       * by the provider-specific webhook integration.
       */
      if (!event.refund_id) {
        throw new Error("refund.failed webhook is missing refund_id");
      }

      await markRefundFailed(
        event.refund_id,
        "Refund failed according to provider webhook",
      );
    } else {
      throw new Error(`Unsupported webhook event type: ${event.event_type}`);
    }

    const processedEvent = await updateWebhookEventStatus(
      webhookEventId,
      "processed",
    );

    return {
      success: true,
      alreadyProcessed: false,
      event: processedEvent,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";

    await updateWebhookEventStatus(webhookEventId, "failed", message);

    throw error;
  }
}
