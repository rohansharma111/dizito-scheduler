import { pool } from "@/lib/db";

interface CreateShipmentItemInput {
  orderItemId: number;
  quantity: number;
}

interface CreateShipmentInput {
  orderId: number;
  locationId: number;
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  items: CreateShipmentItemInput[];
}

export const shipmentService = {
  async createShipment(userId: number, input: CreateShipmentInput) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
      throw new Error("Invalid order");
    }

    if (!Number.isInteger(input.locationId) || input.locationId <= 0) {
      throw new Error("Invalid location");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one shipment item is required");
    }

    for (const item of input.items) {
      if (!Number.isInteger(item.orderItemId) || item.orderItemId <= 0) {
        throw new Error("Invalid order item");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Invalid shipment quantity");
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
          fulfillment_status
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
        throw new Error("Cancelled orders cannot be fulfilled");
      }

      // 2. Validate location ownership
      const locationResult = await client.query(
        `
        SELECT id, name, status
        FROM inventory_locations
        WHERE id = $1
          AND user_id = $2
        FOR UPDATE
        `,
        [input.locationId, userId],
      );

      if (locationResult.rowCount === 0) {
        throw new Error("Inventory location not found");
      }

      const location = locationResult.rows[0];

      if (location.status !== "active") {
        throw new Error("Inventory location is not active");
      }

      // 3. Merge duplicate order items
      const mergedItems = new Map<number, number>();

      for (const item of input.items) {
        const current = mergedItems.get(item.orderItemId) ?? 0;
        const newQuantity = current + item.quantity;

        if (!Number.isSafeInteger(newQuantity)) {
          throw new Error(
            `Shipment quantity is too large for order item ${item.orderItemId}`,
          );
        }

        mergedItems.set(item.orderItemId, newQuantity);
      }

      // 4. Validate each item and its remaining allocation
      for (const [orderItemId, requestedQuantity] of mergedItems) {
        const orderItemResult = await client.query(
          `
          SELECT
            id,
            variant_id,
            quantity
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

        // Quantity already assigned to shipments
        const shippedResult = await client.query(
          `
          SELECT COALESCE(SUM(osi.quantity), 0) AS quantity
          FROM order_shipment_items osi
          INNER JOIN order_shipments os
            ON os.id = osi.shipment_id
          WHERE osi.order_item_id = $1
            AND os.status <> 'cancelled'
          `,
          [orderItemId],
        );

        const alreadyAssignedQuantity = Number(shippedResult.rows[0].quantity);
        const remainingOrderQuantity =
          orderedQuantity - alreadyAssignedQuantity;

        if (requestedQuantity > remainingOrderQuantity) {
          throw new Error(
            `Shipment quantity exceeds remaining quantity for order item ${orderItemId}`,
          );
        }

        // Quantity reserved at this location
        const allocationResult = await client.query(
          `
  SELECT
    COALESCE(SUM(quantity), 0) AS quantity
  FROM order_inventory_allocations
  WHERE order_id = $1
    AND order_item_id = $2
    AND location_id = $3
    AND status = 'reserved'
  `,
          [input.orderId, orderItemId, input.locationId],
        );

        const reservedQuantity = Number(allocationResult.rows[0].quantity);

        // Quantity already assigned to non-cancelled shipments
        // at this specific location.
        const assignedResult = await client.query(
          `
  SELECT
    COALESCE(SUM(osi.quantity), 0) AS quantity
  FROM order_shipment_items osi
  INNER JOIN order_shipments os
    ON os.id = osi.shipment_id
  WHERE osi.order_item_id = $1
    AND os.order_id = $2
    AND os.location_id = $3
    AND os.status <> 'cancelled'
  `,
          [orderItemId, input.orderId, input.locationId],
        );

        const assignedQuantity = Number(assignedResult.rows[0].quantity);

        const remainingReservedQuantity = reservedQuantity - assignedQuantity;

        if (requestedQuantity > remainingReservedQuantity) {
          throw new Error(
            `Shipment quantity exceeds remaining reserved quantity at this location for order item ${orderItemId}`,
          );
        }
      }

      // 5. Create shipment
      const shipmentResult = await client.query(
        `
        INSERT INTO order_shipments (
          order_id,
          location_id,
          carrier,
          service,
          tracking_number,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'pending'
        )
        RETURNING id
        `,
        [
          input.orderId,
          input.locationId,
          input.carrier?.trim() || null,
          input.service?.trim() || null,
          input.trackingNumber?.trim() || null,
        ],
      );

      const shipmentId = Number(shipmentResult.rows[0].id);

      // 6. Create shipment items
      for (const [orderItemId, quantity] of mergedItems) {
        await client.query(
          `
          INSERT INTO order_shipment_items (
            shipment_id,
            order_item_id,
            quantity
          )
          VALUES (
            $1,
            $2,
            $3
          )
          `,
          [shipmentId, orderItemId, quantity],
        );
      }

      await client.query("COMMIT");

      return {
        id: shipmentId,
        orderId: input.orderId,
        locationId: input.locationId,
        status: "pending",
        fulfillmentStatus: order.fulfillment_status,
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
  async shipShipment(userId: number, shipmentId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      throw new Error("Invalid shipment");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock and validate shipment ownership
      const shipmentResult = await client.query(
        `
        SELECT
          os.id,
          os.order_id,
          os.location_id,
          os.status,
          o.order_number,
          o.user_id
        FROM order_shipments os
        INNER JOIN orders o
          ON o.id = os.order_id
        WHERE os.id = $1
          AND o.user_id = $2
        FOR UPDATE OF os
        `,
        [shipmentId, userId],
      );

      if (shipmentResult.rowCount === 0) {
        throw new Error("Shipment not found");
      }

      const shipment = shipmentResult.rows[0];

      if (shipment.status === "shipped") {
        throw new Error("Shipment is already shipped");
      }

      if (shipment.status === "cancelled") {
        throw new Error("Cancelled shipments cannot be shipped");
      }

      if (shipment.status !== "pending" && shipment.status !== "ready") {
        throw new Error(
          `Shipment cannot be shipped from status ${shipment.status}`,
        );
      }

      if (!shipment.location_id) {
        throw new Error("Shipment has no inventory location");
      }

      // 2. Lock shipment items
      const shipmentItemsResult = await client.query(
        `
        SELECT
          osi.id,
          osi.order_item_id,
          osi.quantity,
          oi.variant_id
        FROM order_shipment_items osi
        INNER JOIN order_items oi
          ON oi.id = osi.order_item_id
        WHERE osi.shipment_id = $1
        FOR UPDATE OF osi
        `,
        [shipmentId],
      );

      if (shipmentItemsResult.rowCount === 0) {
        throw new Error("Shipment has no items");
      }

      // 3. Process each shipment item
      for (const item of shipmentItemsResult.rows) {
        const orderItemId = Number(item.order_item_id);
        const variantId = Number(item.variant_id);
        const quantity = Number(item.quantity);

        if (quantity <= 0) {
          throw new Error(
            `Invalid shipment quantity for order item ${orderItemId}`,
          );
        }

        // Lock inventory balance
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
          [shipment.location_id, variantId, userId],
        );

        if (balanceResult.rowCount === 0) {
          throw new Error(
            `Inventory balance not found for variant ${variantId}`,
          );
        }

        const balance = balanceResult.rows[0];

        const onHand = Number(balance.quantity_on_hand);
        const reserved = Number(balance.quantity_reserved);

        if (quantity > reserved) {
          throw new Error(
            `Insufficient reserved inventory for variant ${variantId}`,
          );
        }

        if (quantity > onHand) {
          throw new Error(`Insufficient inventory for variant ${variantId}`);
        }

        // 4. Consume inventory
        await client.query(
          `
          UPDATE inventory_balances
          SET
            quantity_on_hand = quantity_on_hand - $1,
            quantity_reserved = quantity_reserved - $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [quantity, balance.id],
        );

        // 5. Mark corresponding allocation as fulfilled
        let remaining = quantity;

        const allocationResult = await client.query(
          `
          SELECT
            id,
            quantity
          FROM order_inventory_allocations
          WHERE order_id = $1
            AND order_item_id = $2
            AND location_id = $3
            AND status = 'reserved'
          ORDER BY id
          FOR UPDATE
          `,
          [shipment.order_id, orderItemId, shipment.location_id],
        );

        for (const allocation of allocationResult.rows) {
          if (remaining <= 0) {
            break;
          }

          const allocationId = Number(allocation.id);
          const allocationQuantity = Number(allocation.quantity);

          const fulfillQuantity = Math.min(remaining, allocationQuantity);

          if (fulfillQuantity === allocationQuantity) {
            await client.query(
              `
              UPDATE order_inventory_allocations
              SET
                status = 'fulfilled',
                updated_at = NOW()
              WHERE id = $1
              `,
              [allocationId],
            );
          } else {
            // Split the allocation when only part of it is fulfilled.
            await client.query(
              `
              UPDATE order_inventory_allocations
              SET
                quantity = quantity - $1,
                updated_at = NOW()
              WHERE id = $2
              `,
              [fulfillQuantity, allocationId],
            );

            await client.query(
              `
              INSERT INTO order_inventory_allocations (
                order_id,
                order_item_id,
                location_id,
                quantity,
                status
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                'fulfilled'
              )
              `,
              [
                shipment.order_id,
                orderItemId,
                shipment.location_id,
                fulfillQuantity,
              ],
            );
          }

          remaining -= fulfillQuantity;
        }

        if (remaining > 0) {
          throw new Error(
            `Reserved allocation not found for order item ${orderItemId}`,
          );
        }

        // 6. Record inventory movement
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
            'out',
            $4,
            'shipment',
            $5,
            $6
          )
          `,
          [
            userId,
            shipment.location_id,
            variantId,
            -quantity,
            shipmentId,
            `Inventory shipped for order ${shipment.order_number}`,
          ],
        );
      }

      // 7. Mark shipment as shipped
      await client.query(
        `
        UPDATE order_shipments
        SET
          status = 'shipped',
          shipped_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        `,
        [shipmentId],
      );

      // 8. Recalculate order fulfillment status
      const fulfillmentResult = await client.query(
        `
        SELECT
          COALESCE(SUM(oi.quantity), 0) AS ordered_quantity,
          COALESCE(
            (
              SELECT SUM(osi.quantity)
              FROM order_shipment_items osi
              INNER JOIN order_shipments os
                ON os.id = osi.shipment_id
              INNER JOIN order_items oi2
                ON oi2.id = osi.order_item_id
              WHERE oi2.order_id = $1
                AND os.status <> 'cancelled'
                AND os.status IN ('shipped', 'in_transit', 'delivered')
            ),
            0
          ) AS fulfilled_quantity
        FROM order_items oi
        WHERE oi.order_id = $1
        `,
        [shipment.order_id],
      );

      const orderedQuantity = Number(
        fulfillmentResult.rows[0].ordered_quantity,
      );

      const fulfilledQuantity = Number(
        fulfillmentResult.rows[0].fulfilled_quantity,
      );

      const fulfillmentStatus =
        fulfilledQuantity <= 0
          ? "unfulfilled"
          : fulfilledQuantity < orderedQuantity
            ? "partially_fulfilled"
            : "fulfilled";

      await client.query(
        `
        UPDATE orders
        SET
          fulfillment_status = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [fulfillmentStatus, shipment.order_id],
      );

      await client.query("COMMIT");

      return {
        id: Number(shipment.id),
        orderId: Number(shipment.order_id),
        status: "shipped",
        fulfillmentStatus,
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
