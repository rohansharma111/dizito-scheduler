import { pool } from "@/lib/db";
import {
  createPendingRazorpayRefundWithClient,
  executeRazorpayRefund,
} from "@/lib/commerce/payments/refund-service";

interface CreateReturnItemInput {
  orderItemId: number;
  quantity: number;
}

interface CreateReturnInput {
  orderId: number;
  reason?: string;
  customerNote?: string;
  items: CreateReturnItemInput[];
}

interface InitiateReturnRefundResult {
  id: number;
  orderId: number;
  status: string;
  refundId: number;
  refundStatus: string;
  refundAmount: number;
  currency: string;
}

export const returnService = {
  async createReturn(userId: number, input: CreateReturnInput) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
      throw new Error("Invalid order");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one return item is required");
    }

    for (const item of input.items) {
      if (!Number.isInteger(item.orderItemId) || item.orderItemId <= 0) {
        throw new Error("Invalid order item");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Invalid return quantity");
      }
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `
        SELECT
          id,
          order_number,
          order_status,
          fulfillment_status,
          currency
        FROM orders
        WHERE id = $1
          AND user_id = $2
        FOR UPDATE
        `,
        [input.orderId, userId],
      );

      if (orderResult.rowCount === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult.rows[0];

      if (order.order_status === "cancelled") {
        throw new Error("Cancelled orders cannot be returned");
      }

      const mergedItems = new Map<number, number>();

      for (const item of input.items) {
        const current = mergedItems.get(item.orderItemId) ?? 0;
        const newQuantity = current + item.quantity;

        if (!Number.isSafeInteger(newQuantity)) {
          throw new Error(
            `Return quantity is too large for order item ${item.orderItemId}`,
          );
        }

        mergedItems.set(item.orderItemId, newQuantity);
      }

      let totalRefundAmount = 0;

      for (const [orderItemId, requestedQuantity] of mergedItems) {
        const orderItemResult = await client.query(
          `
          SELECT
            id,
            variant_id,
            product_name,
            variant_name,
            sku,
            quantity,
            unit_price,
            discount,
            tax,
            total
          FROM order_items
          WHERE id = $1
            AND order_id = $2
          FOR UPDATE
          `,
          [orderItemId, input.orderId],
        );

        if (orderItemResult.rowCount === 0) {
          throw new Error(`Order item ${orderItemId} not found`);
        }

        const orderItem = orderItemResult.rows[0];

        const shippedResult = await client.query(
          `
          SELECT
            COALESCE(SUM(osi.quantity), 0) AS quantity
          FROM order_shipment_items osi
          INNER JOIN order_shipments os
            ON os.id = osi.shipment_id
          WHERE osi.order_item_id = $1
            AND os.order_id = $2
            AND os.status IN (
              'shipped',
              'in_transit',
              'delivered'
            )
          `,
          [orderItemId, input.orderId],
        );

        const shippedQuantity = Number(shippedResult.rows[0].quantity);

        if (shippedQuantity <= 0) {
          throw new Error(`Order item ${orderItemId} has not been shipped`);
        }

        const returnedResult = await client.query(
          `
          SELECT
            COALESCE(SUM(ori.quantity), 0) AS quantity
          FROM order_return_items ori
          INNER JOIN order_returns r
            ON r.id = ori.return_id
          WHERE ori.order_item_id = $1
            AND r.order_id = $2
            AND r.status <> 'rejected'
            AND r.status <> 'cancelled'
          `,
          [orderItemId, input.orderId],
        );

        const alreadyReturnedQuantity = Number(returnedResult.rows[0].quantity);

        const returnableQuantity = shippedQuantity - alreadyReturnedQuantity;

        if (requestedQuantity > returnableQuantity) {
          throw new Error(
            `Return quantity exceeds returnable quantity for order item ${orderItemId}`,
          );
        }

        const unitPrice = Number(orderItem.unit_price);
        const itemDiscount = Number(orderItem.discount);
        const itemTax = Number(orderItem.tax);
        const itemQuantity = Number(orderItem.quantity);

        const allocatedDiscount =
          itemQuantity > 0
            ? Math.floor((itemDiscount / itemQuantity) * requestedQuantity)
            : 0;

        const allocatedTax =
          itemQuantity > 0
            ? Math.floor((itemTax / itemQuantity) * requestedQuantity)
            : 0;

        const refundAmount =
          unitPrice * requestedQuantity - allocatedDiscount + allocatedTax;

        if (!Number.isSafeInteger(refundAmount) || refundAmount < 0) {
          throw new Error(
            `Invalid refund amount for order item ${orderItemId}`,
          );
        }

        totalRefundAmount += refundAmount;

        if (!Number.isSafeInteger(totalRefundAmount)) {
          throw new Error("Total refund amount is too large");
        }
      }

      const returnResult = await client.query(
        `
        INSERT INTO order_returns (
          order_id,
          status,
          reason,
          customer_note,
          refund_amount,
          currency
        )
        VALUES (
          $1,
          'requested',
          $2,
          $3,
          $4,
          $5
        )
        RETURNING id
        `,
        [
          input.orderId,
          input.reason?.trim() || null,
          input.customerNote?.trim() || null,
          totalRefundAmount,
          order.currency,
        ],
      );

      const returnId = Number(returnResult.rows[0].id);

      for (const [orderItemId, requestedQuantity] of mergedItems) {
        const orderItemResult = await client.query(
          `
          SELECT
            quantity,
            unit_price,
            discount,
            tax
          FROM order_items
          WHERE id = $1
            AND order_id = $2
          `,
          [orderItemId, input.orderId],
        );

        const orderItem = orderItemResult.rows[0];

        const itemQuantity = Number(orderItem.quantity);
        const unitPrice = Number(orderItem.unit_price);
        const itemDiscount = Number(orderItem.discount);
        const itemTax = Number(orderItem.tax);

        const allocatedDiscount =
          itemQuantity > 0
            ? Math.floor((itemDiscount / itemQuantity) * requestedQuantity)
            : 0;

        const allocatedTax =
          itemQuantity > 0
            ? Math.floor((itemTax / itemQuantity) * requestedQuantity)
            : 0;

        const refundAmount =
          unitPrice * requestedQuantity - allocatedDiscount + allocatedTax;

        await client.query(
          `
          INSERT INTO order_return_items (
            return_id,
            order_item_id,
            quantity,
            refund_amount
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
          `,
          [returnId, orderItemId, requestedQuantity, refundAmount],
        );
      }

      await client.query("COMMIT");

      return {
        id: returnId,
        orderId: input.orderId,
        status: "requested",
        refundAmount: totalRefundAmount,
        currency: order.currency,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }
  },

  async updateReturnStatus(
    userId: number,
    returnId: number,
    newStatus:
      | "approved"
      | "rejected"
      | "cancelled"
      | "in_transit"
      | "received",
  ) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(returnId) || returnId <= 0) {
      throw new Error("Invalid return");
    }

    const validStatuses = [
      "approved",
      "rejected",
      "cancelled",
      "in_transit",
      "received",
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid return status");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const returnResult = await client.query(
        `
        SELECT
          r.id,
          r.order_id,
          r.status,
          r.refund_amount,
          r.currency,
          o.order_number,
          o.user_id
        FROM order_returns r
        INNER JOIN orders o
          ON o.id = r.order_id
        WHERE r.id = $1
          AND o.user_id = $2
        FOR UPDATE OF r
        `,
        [returnId, userId],
      );

      if (returnResult.rowCount === 0) {
        throw new Error("Return not found");
      }

      const returnRecord = returnResult.rows[0];
      const currentStatus = returnRecord.status;

      if (currentStatus === newStatus) {
        throw new Error("Return is already in this status");
      }

      const allowedTransitions: Record<string, string[]> = {
        requested: ["approved", "rejected", "cancelled"],
        approved: ["in_transit", "cancelled"],
        in_transit: ["received"],
        received: [],
        rejected: [],
        cancelled: [],
        completed: [],
      };

      const allowed =
        allowedTransitions[currentStatus]?.includes(newStatus) ?? false;

      if (!allowed) {
        throw new Error(
          `Return cannot transition from ${currentStatus} to ${newStatus}`,
        );
      }

      if (newStatus === "approved") {
        await client.query(
          `
          UPDATE order_returns
          SET
            status = 'approved',
            approved_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          `,
          [returnId],
        );
      } else if (newStatus === "received") {
        await client.query(
          `
          UPDATE order_returns
          SET
            status = 'received',
            received_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          `,
          [returnId],
        );
      } else {
        await client.query(
          `
          UPDATE order_returns
          SET
            status = $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [newStatus, returnId],
        );
      }

      await client.query("COMMIT");

      return {
        id: Number(returnRecord.id),
        orderId: Number(returnRecord.order_id),
        status: newStatus,
        refundAmount: Number(returnRecord.refund_amount),
        currency: returnRecord.currency,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }
  },

  async initiateReturnRefund(
    userId: number,
    returnId: number,
    idempotencyKey: string,
    reason?: string | null,
  ): Promise<InitiateReturnRefundResult> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(returnId) || returnId <= 0) {
      throw new Error("Invalid return");
    }

    const normalizedIdempotencyKey = String(idempotencyKey ?? "").trim();

    if (!normalizedIdempotencyKey) {
      throw new Error("Refund idempotency key is required");
    }

    if (normalizedIdempotencyKey.length < 10) {
      throw new Error("Refund idempotency key must be at least 10 characters");
    }

    if (!/^[A-Za-z0-9_-]+$/.test(normalizedIdempotencyKey)) {
      throw new Error("Refund idempotency key contains invalid characters");
    }

    const client = await pool.connect();

    let refundId: number;
    let orderId: number;
    let returnStatus: string;
    let refundAmount: number;
    let currency: string;

    try {
      await client.query("BEGIN");

      /*
       * Lock the return.
       *
       * This is the key concurrency protection.
       *
       * The first request creates and links the local refund
       * while holding this lock. A concurrent request waits,
       * then sees the linked refund.
       */
      const returnResult = await client.query(
        `
        SELECT
          r.id,
          r.order_id,
          r.status,
          r.refund_amount,
          r.currency,
          r.refund_id,
          o.user_id
        FROM order_returns r
        INNER JOIN orders o
          ON o.id = r.order_id
        WHERE r.id = $1::bigint
          AND o.user_id = $2::bigint
        FOR UPDATE OF r
        `,
        [returnId, userId],
      );

      if ((returnResult.rowCount ?? 0) === 0) {
        throw new Error("Return not found");
      }

      const returnRecord = returnResult.rows[0];

      if (returnRecord.status !== "received") {
        throw new Error(
          "Return refund can only be initiated after the return is received",
        );
      }

      orderId = Number(returnRecord.order_id);
      returnStatus = returnRecord.status;
      refundAmount = Number(returnRecord.refund_amount);
      currency = String(returnRecord.currency).toUpperCase();

      if (refundAmount <= 0) {
        throw new Error("Return refund amount must be greater than zero");
      }

      /*
       * If a refund is already linked:
       *
       * - succeeded  -> return it
       * - pending     -> recover/execute it
       * - processing  -> recover/execute it
       * - failed      -> create a NEW refund attempt
       * - cancelled   -> create a NEW refund attempt
       */
      if (returnRecord.refund_id) {
        const existingRefundResult = await client.query(
          `
            SELECT
              id,
              order_id,
              payment_id,
              provider,
              amount,
              currency,
              status,
              provider_refund_id,
              idempotency_key,
              reason
            FROM order_refunds
            WHERE id = $1::bigint
              AND order_id = $2::bigint
            FOR UPDATE
            `,
          [returnRecord.refund_id, orderId],
        );

        if ((existingRefundResult.rowCount ?? 0) === 0) {
          throw new Error("Linked refund record not found");
        }

        const existingRefund = existingRefundResult.rows[0];

        if (existingRefund.status === "succeeded") {
          await client.query("COMMIT");

          return {
            id: returnId,
            orderId,
            status: returnStatus,
            refundId: Number(existingRefund.id),
            refundStatus: existingRefund.status,
            refundAmount: Number(existingRefund.amount),
            currency: existingRefund.currency,
          };
        }

        /*
         * Existing pending/processing refund:
         *
         * Do NOT create another refund.
         */
        if (
          existingRefund.status === "pending" ||
          existingRefund.status === "processing"
        ) {
          refundId = Number(existingRefund.id);

          await client.query("COMMIT");

          const execution = await executeRazorpayRefund(refundId);

          const refund = execution.refund;

          return {
            id: returnId,
            orderId,
            status: returnStatus,
            refundId,
            refundStatus: refund.status,
            refundAmount: Number(refund.amount),
            currency: refund.currency,
          };
        }

        /*
         * Failed/cancelled refunds are retained for audit.
         *
         * A new attempt is therefore created below.
         */
      }

      /*
       * Find the logical Razorpay payment that funded the order.
       *
       * MVP policy remains one successful Razorpay payment per
       * order. The payment service itself still prevents the
       * refund from exceeding that payment's remaining capacity.
       */
      const paymentResult = await client.query(
        `
        SELECT
          id,
          amount,
          currency,
          status
        FROM order_payments
        WHERE order_id = $1::bigint
          AND status IN (
            'paid',
            'partially_refunded',
            'refunded'
          )
          AND provider = 'razorpay'
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
        `,
        [orderId],
      );

      if ((paymentResult.rowCount ?? 0) === 0) {
        throw new Error("No successful Razorpay payment found for this order");
      }

      const payment = paymentResult.rows[0];

      if (String(payment.currency).toUpperCase() !== currency) {
        throw new Error("Return currency does not match payment currency");
      }

      /*
       * For a failed/cancelled previous attempt,
       * this request's idempotency key creates a new
       * auditable refund attempt.
       *
       * The return remains linked to this new attempt
       * before we commit.
       */
      const localResult = await createPendingRazorpayRefundWithClient(client, {
        userId,
        orderId,
        paymentId: Number(payment.id),
        amount: refundAmount,
        currency,
        idempotencyKey: normalizedIdempotencyKey,
        reason: reason?.trim() || `Refund for return ${returnId}`,
      });

      refundId = Number(localResult.refund.id);

      /*
       * ATOMIC CLAIM:
       *
       * The local refund now becomes permanently associated
       * with this return before any external provider call.
       */
      await client.query(
        `
        UPDATE order_returns
        SET
          refund_id = $1::bigint,
          updated_at = NOW()
        WHERE id = $2::bigint
          AND refund_id IS NULL
  `,
        [refundId, returnId],
      );

      /*
       * The return is locked, so the UPDATE above should always
       * affect this return.
       *
       * Verify the relationship explicitly.
       */
      const verifyLink = await client.query(
        `
        SELECT refund_id
        FROM order_returns
        WHERE id = $1::bigint
        `,
        [returnId],
      );

      if (
        (verifyLink.rowCount ?? 0) === 0 ||
        Number(verifyLink.rows[0].refund_id) !== refundId
      ) {
        throw new Error("Failed to link refund to return");
      }

      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }

    /*
     * Provider call happens only after the atomic local claim
     * has committed.
     */
    const execution = await executeRazorpayRefund(refundId);

    const refund = execution.refund;

    return {
      id: returnId,
      orderId,
      status: returnStatus,
      refundId,
      refundStatus: refund.status,
      refundAmount: Number(refund.amount),
      currency: refund.currency,
    };
  },

  async completeReturn(userId: number, returnId: number, locationId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(returnId) || returnId <= 0) {
      throw new Error("Invalid return");
    }

    if (!Number.isInteger(locationId) || locationId <= 0) {
      throw new Error("Invalid inventory location");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const returnResult = await client.query(
        `
        SELECT
          r.id,
          r.order_id,
          r.status,
          r.refund_amount,
          r.currency,
          r.refund_id,
          o.order_number,
          o.user_id
        FROM order_returns r
        INNER JOIN orders o
          ON o.id = r.order_id
        WHERE r.id = $1
          AND o.user_id = $2
        FOR UPDATE OF r
        `,
        [returnId, userId],
      );

      if (returnResult.rowCount === 0) {
        throw new Error("Return not found");
      }

      const returnRecord = returnResult.rows[0];

      if (returnRecord.status !== "received") {
        throw new Error("Return can only be completed from received status");
      }

      if (!returnRecord.refund_id) {
        throw new Error(
          "Return cannot be completed before a refund is initiated",
        );
      }

      const refundResult = await client.query(
        `
          SELECT
            id,
            status,
            amount,
            currency
          FROM order_refunds
          WHERE id = $1
            AND order_id = $2
          FOR UPDATE
          `,
        [returnRecord.refund_id, returnRecord.order_id],
      );

      if (refundResult.rowCount === 0) {
        throw new Error("Linked refund not found");
      }

      const refund = refundResult.rows[0];

      if (refund.status !== "succeeded") {
        throw new Error(
          `Return cannot be completed until refund succeeds; current refund status is ${refund.status}`,
        );
      }

      if (Number(refund.amount) !== Number(returnRecord.refund_amount)) {
        throw new Error("Linked refund amount does not match return amount");
      }

      if (
        String(refund.currency).toUpperCase() !==
        String(returnRecord.currency).toUpperCase()
      ) {
        throw new Error(
          "Linked refund currency does not match return currency",
        );
      }

      const locationResult = await client.query(
        `
          SELECT
            id,
            name,
            status
          FROM inventory_locations
          WHERE id = $1
            AND user_id = $2
          FOR UPDATE
          `,
        [locationId, userId],
      );

      if (locationResult.rowCount === 0) {
        throw new Error("Inventory location not found");
      }

      const location = locationResult.rows[0];

      if (location.status !== "active") {
        throw new Error("Inventory location is not active");
      }

      const returnItemsResult = await client.query(
        `
          SELECT
            ori.id,
            ori.order_item_id,
            ori.quantity,
            ori.refund_amount,
            oi.variant_id,
            oi.sku
          FROM order_return_items ori
          INNER JOIN order_items oi
            ON oi.id = ori.order_item_id
          WHERE ori.return_id = $1
          FOR UPDATE OF ori
          `,
        [returnId],
      );

      if (returnItemsResult.rowCount === 0) {
        throw new Error("Return has no items");
      }

      for (const item of returnItemsResult.rows) {
        const variantId = Number(item.variant_id);
        const quantity = Number(item.quantity);

        if (quantity <= 0) {
          throw new Error(
            `Invalid return quantity for order item ${item.order_item_id}`,
          );
        }

        const balanceResult = await client.query(
          `
            SELECT
              id,
              quantity_on_hand,
              quantity_reserved
            FROM inventory_balances
            WHERE location_id = $1
              AND variant_id = $2
              AND user_id = $3
            FOR UPDATE
            `,
          [locationId, variantId, userId],
        );

        if (balanceResult.rowCount === 0) {
          const newBalanceResult = await client.query(
            `
              INSERT INTO inventory_balances (
                user_id,
                location_id,
                variant_id,
                quantity_on_hand,
                quantity_reserved
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                0
              )
              RETURNING id
              `,
            [userId, locationId, variantId, quantity],
          );

          if (newBalanceResult.rowCount === 0) {
            throw new Error(
              `Failed to create inventory balance for variant ${variantId}`,
            );
          }
        } else {
          const balance = balanceResult.rows[0];

          await client.query(
            `
            UPDATE inventory_balances
            SET
              quantity_on_hand =
                quantity_on_hand + $1,
              updated_at = NOW()
            WHERE id = $2
            `,
            [quantity, balance.id],
          );
        }

        await client.query(
          `
          INSERT INTO inventory_movements (
            user_id,
            location_id,
            variant_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            note
          )
          VALUES (
            $1,
            $2,
            $3,
            'in',
            $4,
            'return',
            $5,
            $6
          )
          `,
          [
            userId,
            locationId,
            variantId,
            quantity,
            returnId,
            `Returned inventory received for order ${returnRecord.order_number}`,
          ],
        );
      }

      await client.query(
        `
        UPDATE order_returns
        SET
          status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        `,
        [returnId],
      );

      await client.query("COMMIT");

      return {
        id: Number(returnRecord.id),
        orderId: Number(returnRecord.order_id),
        status: "completed",
        refundAmount: Number(returnRecord.refund_amount),
        currency: returnRecord.currency,
        refundId: Number(returnRecord.refund_id),
        locationId,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }
  },
};
