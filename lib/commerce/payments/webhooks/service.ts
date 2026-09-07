import { pool } from "@/lib/db";

export type PaymentWebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed";

export interface CreateWebhookEventInput {
  provider: string;
  providerEventId: string;
  eventType: string;

  // Internal Dizito IDs
  paymentId?: number;
  refundId?: number;

  // Provider-side IDs
  providerPaymentId?: string;
  providerRefundId?: string;

  payload?: unknown;
}

export async function createWebhookEvent(input: CreateWebhookEventInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Idempotency:
     * If this provider event has already been received,
     * return the existing event instead of creating another one.
     */
    const existing = await client.query(
      `
      SELECT
        id,
        provider,
        provider_event_id,
        event_type,
        payment_id,
        refund_id,
        provider_payment_id,
        provider_refund_id,
        status,
        payload,
        processed_at,
        error_message,
        created_at,
        updated_at
      FROM payment_webhook_events
      WHERE provider = $1
        AND provider_event_id = $2
      FOR UPDATE
      `,
      [input.provider.trim(), input.providerEventId.trim()],
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query("COMMIT");

      return existing.rows[0];
    }

    const inserted = await client.query(
      `
      INSERT INTO payment_webhook_events (
        provider,
        provider_event_id,
        event_type,
        payment_id,
        refund_id,
        provider_payment_id,
        provider_refund_id,
        payload,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::jsonb,
        'received'
      )
      RETURNING
        id,
        provider,
        provider_event_id,
        event_type,
        payment_id,
        refund_id,
        provider_payment_id,
        provider_refund_id,
        status,
        payload,
        processed_at,
        error_message,
        created_at,
        updated_at
      `,
      [
        input.provider.trim(),
        input.providerEventId.trim(),
        input.eventType.trim(),
        input.paymentId ?? null,
        input.refundId ?? null,
        input.providerPaymentId ?? null,
        input.providerRefundId ?? null,
        JSON.stringify(input.payload ?? null),
      ],
    );

    await client.query("COMMIT");

    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateWebhookEventStatus(
  eventId: number,
  status: PaymentWebhookEventStatus,
  errorMessage?: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE payment_webhook_events
      SET
        status = $1::varchar,
        processed_at = CASE
          WHEN $1::varchar = 'processed'
            THEN NOW()
          ELSE processed_at
        END,
        error_message = $2,
        updated_at = NOW()
      WHERE id = $3::bigint
      RETURNING
        id,
        provider,
        provider_event_id,
        event_type,
        payment_id,
        refund_id,
        provider_payment_id,
        provider_refund_id,
        status,
        processed_at,
        error_message,
        updated_at
      `,
      [status, errorMessage ?? null, eventId],
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new Error("Webhook event not found");
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
