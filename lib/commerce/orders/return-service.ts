import { pool } from "@/lib/db";

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
      | "received"
      | "completed",
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
      "completed",
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid return status");
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

      // 2. Validate transition
      const allowedTransitions: Record<string, string[]> = {
        requested: ["approved", "rejected", "cancelled"],
        approved: ["in_transit", "cancelled"],
        in_transit: ["received"],
        received: ["completed"],
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

      // 3. Update timestamps according to transition
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
      } else if (newStatus === "completed") {
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
        throw new Error(`Return can only be completed from received status`);
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

        // Lock existing inventory balance if present.
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
          // Create a new balance for the receiving location.
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

      // 6. Record refund as a payment/refund transaction
      const refundAmount = Number(returnRecord.refund_amount);

      if (refundAmount < 0 || !Number.isSafeInteger(refundAmount)) {
        throw new Error("Invalid refund amount");
      }

      if (refundAmount > 0) {
        await client.query(
          `
          INSERT INTO order_payments (
            order_id,
            provider,
            payment_method,
            transaction_id,
            amount,
            currency,
            status,
            paid_at
          )
          VALUES (
            $1,
            'return',
            'refund',
            $2,
            $3,
            $4,
            'refunded',
            NOW()
          )
          `,
          [
            returnRecord.order_id,
            `return-${returnId}`,
            refundAmount,
            returnRecord.currency,
          ],
        );
      }

      // 7. Mark return as completed
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
        refundAmount,
        currency: returnRecord.currency,
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
