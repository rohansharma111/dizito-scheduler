import { pool } from "@/lib/db";
import { transitionPaymentStatus } from "../state";
import {
  createPaymentAttemptRecord,
} from "../attempt-service";
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

async function ensurePaymentAttempt(
  paymentId: number,
  provider: string,
  providerPaymentId: string,
  status: "pending" | "authorized" | "captured" | "failed",
  payload: unknown,
) {
  /*
   * The webhook payload contains the authoritative provider payment
   * information. Extract amount/currency/error information where
   * available.
   */
  const paymentEntity =
    typeof payload === "object" &&
    payload !== null &&
    "payload" in payload &&
    typeof (payload as Record<string, unknown>).payload === "object" &&
    (payload as Record<string, unknown>).payload !== null
      ? (
          (payload as Record<string, unknown>).payload as Record<
            string,
            unknown
          >
        ).payment
      : undefined;

  const entity =
    typeof paymentEntity === "object" &&
    paymentEntity !== null &&
    "entity" in paymentEntity &&
    typeof (paymentEntity as Record<string, unknown>).entity === "object"
      ? (paymentEntity as Record<string, unknown>).entity
      : undefined;

  const payment = (entity ?? {}) as Record<string, unknown>;

  const amount = Number(payment.amount ?? 0);

  const currency = String(payment.currency ?? "").toUpperCase();

  const errorCode =
    payment.error_code !== null && payment.error_code !== undefined
      ? String(payment.error_code)
      : undefined;

  const errorDescription =
    payment.error_description !== null &&
    payment.error_description !== undefined
      ? String(payment.error_description)
      : undefined;

  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Invalid provider payment amount for ${providerPaymentId}`);
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      `Invalid provider payment currency for ${providerPaymentId}`,
    );
  }

  return createPaymentAttemptRecord({
    paymentId,
    provider,
    providerPaymentId,
    amount,
    currency,
    status,
    errorCode,
    errorDescription,
    metadata: payment,
  });
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
        provider_payment_id,
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
     * ------------------------------------------------------------
     * PAYMENT EVENTS
     * ------------------------------------------------------------
     *
     * Every Razorpay payment ID represents a separate payment
     * attempt, even when multiple attempts belong to the same
     * Razorpay order.
     *
     * Example:
     *
     * order_123
     *   ├── pay_ABC → failed
     *   └── pay_XYZ → captured
     *
     * Both attempts belong to the same Dizito order_payments row.
     */

    if (event.event_type === "payment.authorized") {
      if (!event.payment_id) {
        throw new Error("payment.authorized webhook requires payment_id");
      }

      if (!event.provider_payment_id) {
        throw new Error(
          "payment.authorized webhook requires provider_payment_id",
        );
      }

      await ensurePaymentAttempt(
        Number(event.payment_id),
        event.provider,
        event.provider_payment_id,
        "authorized",
        event.payload,
      );

      /*
       * The logical payment can move from pending → authorized.
       *
       * If a retry produces authorized after an earlier failed
       * attempt, the logical payment may already be failed.
       *
       * In that case we don't transition the logical payment yet.
       * The later captured event will move it directly to paid.
       */
      const paymentState = await pool.query(
        `
        SELECT status
        FROM order_payments
        WHERE id = $1::bigint
        LIMIT 1
        `,
        [Number(event.payment_id)],
      );

      if ((paymentState.rowCount ?? 0) === 0) {
        throw new Error("Payment not found");
      }

      const currentStatus = paymentState.rows[0].status as string;

      if (currentStatus === "pending") {
        await transitionPaymentStatus(Number(event.payment_id), "authorized");
      }
    } else if (event.event_type === "payment.captured") {
      if (!event.payment_id) {
        throw new Error("payment.captured webhook requires payment_id");
      }

      if (!event.provider_payment_id) {
        throw new Error(
          "payment.captured webhook requires provider_payment_id",
        );
      }

      await ensurePaymentAttempt(
        Number(event.payment_id),
        event.provider,
        event.provider_payment_id,
        "captured",
        event.payload,
      );

      /*
       * A successful retry must be allowed to recover a logical
       * payment that previously failed.
       */
      await transitionPaymentStatus(Number(event.payment_id), "paid");
    } else if (event.event_type === "order.paid") {
      if (!event.payment_id) {
        throw new Error("order.paid webhook requires payment_id");
      }

      /*
       * order.paid may contain a payment entity. When available,
       * record that payment attempt as captured as well.
       */
      if (event.provider_payment_id) {
        await ensurePaymentAttempt(
          Number(event.payment_id),
          event.provider,
          event.provider_payment_id,
          "captured",
          event.payload,
        );
      }

      /*
       * If payment.captured already processed this payment,
       * this is a safe same-state transition.
       *
       * If order.paid is the first successful event, this also
       * moves the logical payment to paid.
       */
      await transitionPaymentStatus(Number(event.payment_id), "paid");
    } else if (event.event_type === "payment.failed") {
      if (!event.payment_id) {
        throw new Error("payment.failed webhook requires payment_id");
      }

      if (!event.provider_payment_id) {
        throw new Error("payment.failed webhook requires provider_payment_id");
      }

      await ensurePaymentAttempt(
        Number(event.payment_id),
        event.provider,
        event.provider_payment_id,
        "failed",
        event.payload,
      );

      /*
       * Only mark the logical payment failed when it is currently
       * pending or authorized.
       *
       * If another attempt has already successfully captured the
       * payment, a late failed webhook must not downgrade it.
       */
      const paymentState = await pool.query(
        `
        SELECT status
        FROM order_payments
        WHERE id = $1::bigint
        LIMIT 1
        `,
        [Number(event.payment_id)],
      );

      if ((paymentState.rowCount ?? 0) === 0) {
        throw new Error("Payment not found");
      }

      const currentStatus = paymentState.rows[0].status as string;

      if (currentStatus === "pending" || currentStatus === "authorized") {
        await transitionPaymentStatus(Number(event.payment_id), "failed");
      }
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
