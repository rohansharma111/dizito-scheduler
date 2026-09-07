import { pool } from "@/lib/db";
import { transitionPaymentStatus } from "../state";
import { syncPaymentRefundStatus, markRefundFailed } from "../refund-state";
import { updateWebhookEventStatus } from "./service";

async function getPaymentIdFromRefund(refundId: number): Promise<number> {
  const result = await pool.query(
    `
    SELECT payment_id
    FROM order_refunds
    WHERE id = $1::bigint
    LIMIT 1
    `,
    [refundId],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error(`Refund ${refundId} not found`);
  }

  return Number(result.rows[0].payment_id);
}

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
     * Razorpay payment.authorized
     *
     * A payment has been authorized but is not yet captured.
     */
    if (event.event_type === "payment.authorized") {
      if (!event.payment_id) {
        throw new Error("payment.authorized webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "authorized");
    } else if (event.event_type === "payment.captured") {

    /*
     * Razorpay payment.captured
     *
     * This is the main successful payment event.
     */
      if (!event.payment_id) {
        throw new Error("payment.captured webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "paid");
    } else if (event.event_type === "order.paid") {

    /*
     * Razorpay order.paid
     *
     * The order has been fully paid.
     *
     * We use the internal payment associated with the
     * Razorpay order and transition that payment to paid.
     */
      if (!event.payment_id) {
        throw new Error("order.paid webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "paid");
    } else if (event.event_type === "payment.failed") {

    /*
     * Razorpay payment.failed
     */
      if (!event.payment_id) {
        throw new Error("payment.failed webhook requires payment_id");
      }

      await transitionPaymentStatus(Number(event.payment_id), "failed");
    } else if (event.event_type === "refund.processed") {

    /*
     * Razorpay refund.processed
     *
     * The provider has successfully processed the refund.
     * Only successful refunds are included in payment
     * refund accounting.
     */
      if (!event.refund_id) {
        throw new Error("refund.processed webhook requires refund_id");
      }

      const paymentId = await getPaymentIdFromRefund(Number(event.refund_id));

      await syncPaymentRefundStatus(paymentId);
    } else if (event.event_type === "refund.failed") {

    /*
     * Razorpay refund.failed
     */
      if (!event.refund_id) {
        throw new Error("refund.failed webhook is missing refund_id");
      }

      await markRefundFailed(
        Number(event.refund_id),
        "Refund failed according to Razorpay webhook",
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
