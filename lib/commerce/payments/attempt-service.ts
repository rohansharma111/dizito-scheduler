import { pool } from "@/lib/db";

export type PaymentAttemptStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

const allowedAttemptTransitions: Record<
  PaymentAttemptStatus,
  PaymentAttemptStatus[]
> = {
  pending: ["authorized", "captured", "failed", "cancelled"],
  authorized: ["captured", "failed", "cancelled"],
  captured: ["refunded", "partially_refunded"],
  failed: [],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded"],
};

export interface CreatePaymentAttemptRecordInput {
  paymentId: number;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentAttemptStatus;
  errorCode?: string;
  errorDescription?: string;
  metadata?: unknown;
}

export async function createPaymentAttemptRecord(
  input: CreatePaymentAttemptRecordInput,
) {
  const provider = input.provider.trim();
  const providerPaymentId = input.providerPaymentId.trim();
  const currency = input.currency.trim().toUpperCase();

  if (!Number.isInteger(input.paymentId) || input.paymentId <= 0) {
    throw new Error("Invalid payment ID");
  }

  if (!provider) {
    throw new Error("Provider is required");
  }

  if (!providerPaymentId) {
    throw new Error("Provider payment ID is required");
  }

  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new Error("Invalid payment attempt amount");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid payment attempt currency");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Lock the parent payment.
     */
    const paymentResult = await client.query(
      `
      SELECT
        id,
        order_id,
        amount,
        currency
      FROM order_payments
      WHERE id = $1::bigint
      FOR UPDATE
      `,
      [input.paymentId],
    );

    if ((paymentResult.rowCount ?? 0) === 0) {
      throw new Error("Payment not found");
    }

    const payment = paymentResult.rows[0];

    if (String(payment.currency).toUpperCase() !== currency) {
      throw new Error("Payment attempt currency mismatch");
    }

    /*
     * Same provider payment ID = same payment attempt.
     *
     * This makes webhook delivery idempotent at the provider-payment
     * level as well as at the webhook-event level.
     */
    const existing = await client.query(
      `
      SELECT
        id,
        payment_id,
        provider,
        provider_payment_id,
        amount,
        currency,
        status,
        error_code,
        error_description,
        metadata,
        created_at,
        updated_at
      FROM order_payment_attempts
      WHERE provider = $1
        AND provider_payment_id = $2
      FOR UPDATE
      `,
      [provider, providerPaymentId],
    );

    if ((existing.rowCount ?? 0) > 0) {
      const existingAttempt = existing.rows[0];

      if (Number(existingAttempt.payment_id) !== input.paymentId) {
        throw new Error(
          "Provider payment ID is already attached to another payment",
        );
      }

      const currentStatus = existingAttempt.status as PaymentAttemptStatus;

      /*
       * Same-state webhook/event is safe and idempotent.
       */
      if (currentStatus === input.status) {
        await client.query("COMMIT");
        return existingAttempt;
      }

      /*
       * Validate attempt-level lifecycle.
       */
      if (!allowedAttemptTransitions[currentStatus].includes(input.status)) {
        throw new Error(
          `Invalid payment attempt status transition: ${currentStatus} -> ${input.status}`,
        );
      }

      const updated = await client.query(
        `
        UPDATE order_payment_attempts
        SET
          status = $1::varchar,
          error_code = $2,
          error_description = $3,
          metadata = COALESCE($4::jsonb, metadata),
          updated_at = NOW()
        WHERE id = $5::bigint
        RETURNING
          id,
          payment_id,
          provider,
          provider_payment_id,
          amount,
          currency,
          status,
          error_code,
          error_description,
          metadata,
          created_at,
          updated_at
        `,
        [
          input.status,
          input.errorCode ?? null,
          input.errorDescription ?? null,
          input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
          existingAttempt.id,
        ],
      );

      await client.query("COMMIT");

      return updated.rows[0];
    }

    /*
     * New provider payment attempt.
     */
    const inserted = await client.query(
      `
      INSERT INTO order_payment_attempts (
        payment_id,
        provider,
        provider_payment_id,
        amount,
        currency,
        status,
        error_code,
        error_description,
        metadata
      )
      VALUES (
        $1::bigint,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::jsonb
      )
      RETURNING
        id,
        payment_id,
        provider,
        provider_payment_id,
        amount,
        currency,
        status,
        error_code,
        error_description,
        metadata,
        created_at,
        updated_at
      `,
      [
        input.paymentId,
        provider,
        providerPaymentId,
        input.amount,
        currency,
        input.status,
        input.errorCode ?? null,
        input.errorDescription ?? null,
        JSON.stringify(input.metadata ?? null),
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
