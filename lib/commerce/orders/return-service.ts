import { pool } from "@/lib/db";
import { processRazorpayRefund } from "@/lib/commerce/payments/refund-service";

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

      // 1. Lock and validate order ownership
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

      // 2. Merge duplicate order items
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

      // 3. Validate each return item
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

        const orderedQuantity = Number(orderItem.quantity);

        // 4. Calculate shipped quantity
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

        // 5. Calculate quantity already returned
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

        // 6. Calculate refund using historical unit price
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

      // 7. Create return
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

      // 8. Create return items
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

    let returnRecord;

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

      returnRecord = returnResult.rows[0];

      if (returnRecord.status !== "received") {
        throw new Error(
          "Return refund can only be initiated after the return is received",
        );
      }

      if (returnRecord.refund_id) {
        const existingRefundResult = await client.query(
          `
          SELECT
            id,
            status,
            amount,
            currency
          FROM order_refunds
          WHERE id = $1
            AND order_id = $2
            AND payment_id IS NOT NULL
          LIMIT 1
          `,
          [returnRecord.refund_id, returnRecord.order_id],
        );

        if ((existingRefundResult.rowCount ?? 0) > 0) {
          await client.query("COMMIT");

          const existingRefund = existingRefundResult.rows[0];

          return {
            id: Number(returnRecord.id),
            orderId: Number(returnRecord.order_id),
            status: returnRecord.status,
            refundId: Number(existingRefund.id),
            refundStatus: existingRefund.status,
            refundAmount: Number(existingRefund.amount),
            currency: existingRefund.currency,
          };
        }

        throw new Error("Linked refund record not found");
      }

      /*
       * Find the logical Commerce payment that funded the order.
       *
       * We only use payments that are financially successful.
       */
      const paymentResult = await client.query(
        `
        SELECT
          id,
          amount,
          currency,
          status
        FROM order_payments
        WHERE order_id = $1
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
        [returnRecord.order_id],
      );

      if (paymentResult.rowCount === 0) {
        throw new Error("No successful Razorpay payment found for this order");
      }

      const payment = paymentResult.rows[0];

      if (
        String(payment.currency).toUpperCase() !==
        String(returnRecord.currency).toUpperCase()
      ) {
        throw new Error("Return currency does not match payment currency");
      }

      if (returnRecord.refund_amount <= 0) {
        throw new Error("Return refund amount must be greater than zero");
      }

      /*
       * Reserve/link the return to the logical payment before
       * making the external provider call.
       *
       * We intentionally do not call Razorpay while this transaction
       * is open.
       */
      await client.query(
        `
        UPDATE order_returns
        SET
          updated_at = NOW()
        WHERE id = $1
        `,
        [returnId],
      );

      await client.query("COMMIT");

      /*
       * External Razorpay refund operation happens after the
       * database transaction has committed.
       */
      const refundResult = await processRazorpayRefund({
        userId,
        orderId: Number(returnRecord.order_id),
        paymentId: Number(payment.id),
        amount: Number(returnRecord.refund_amount),
        currency: String(returnRecord.currency).toUpperCase(),
        idempotencyKey: normalizedIdempotencyKey,
        reason: reason?.trim() || `Refund for return ${returnId}`,
      });

      /*
       * Link the local return to the local refund.
       *
       * The refund service has already created the order_refunds
       * record before calling Razorpay.
       */
      const refundId = Number(refundResult.refund.id);

      const linkResult = await pool.query(
        `
        UPDATE order_returns
        SET
          refund_id = $1::bigint,
          updated_at = NOW()
        WHERE id = $2::bigint
          AND order_id = $3::bigint
          AND refund_id IS NULL
        RETURNING id, order_id, status, refund_id
        `,
        [refundId, returnId, Number(returnRecord.order_id)],
      );

      /*
       * If another request already linked a refund, return the
       * existing relationship instead of overwriting it.
       */
      if ((linkResult.rowCount ?? 0) === 0) {
        const existingLink = await pool.query(
          `
          SELECT
            r.id,
            r.order_id,
            r.status,
            r.refund_id,
            rf.status AS refund_status,
            rf.amount,
            rf.currency
          FROM order_returns r
          INNER JOIN order_refunds rf
            ON rf.id = r.refund_id
          WHERE r.id = $1::bigint
            AND r.order_id = $2::bigint
          LIMIT 1
          `,
          [returnId, Number(returnRecord.order_id)],
        );

        if ((existingLink.rowCount ?? 0) === 0) {
          throw new Error("Return refund could not be linked");
        }

        const existing = existingLink.rows[0];

        return {
          id: Number(existing.id),
          orderId: Number(existing.order_id),
          status: existing.status,
          refundId: Number(existing.refund_id),
          refundStatus: existing.refund_status,
          refundAmount: Number(existing.amount),
          currency: existing.currency,
        };
      }

      const finalRefundResult = await pool.query(
        `
        SELECT
          id,
          status,
          amount,
          currency
        FROM order_refunds
        WHERE id = $1::bigint
        LIMIT 1
        `,
        [refundId],
      );

      if ((finalRefundResult.rowCount ?? 0) === 0) {
        throw new Error("Refund record not found after creation");
      }

      const finalRefund = finalRefundResult.rows[0];

      return {
        id: returnId,
        orderId: Number(returnRecord.order_id),
        status: returnRecord.status,
        refundId,
        refundStatus: finalRefund.status,
        refundAmount: Number(finalRefund.amount),
        currency: finalRefund.currency,
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

      // 1. Lock and validate return ownership
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

      /*
       * A return cannot be completed until its actual provider
       * refund has succeeded.
       */
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

      // 2. Validate receiving location
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

      // 3. Lock return items
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

      // 4. Restock each returned item
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
              quantity_on_hand = quantity_on_hand + $1,
              updated_at = NOW()
            WHERE id = $2
            `,
            [quantity, balance.id],
          );
        }

        // 5. Record inventory movement
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

      // 6. Mark return as completed.
      //
      // The financial refund already exists in order_refunds and
      // has already succeeded. No fake order_payments refund
      // record is created here.
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
