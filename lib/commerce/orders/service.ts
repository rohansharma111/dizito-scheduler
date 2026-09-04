import { pool } from "@/lib/db";

interface CreateOrderItemInput {
  variantId: number;
  quantity: number;
}

interface CreateOrderInput {
  orderNumber: string;
  source?: string;

  customerId?: number;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  currency?: string;

  discount?: number;
  shippingFee?: number;
  tax?: number;

  notes?: string;

  items: CreateOrderItemInput[];
}

export const orderService = {
  async createOrder(userId: number, input: CreateOrderInput) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!input.orderNumber?.trim()) {
      throw new Error("Order number is required");
    }

    if (input.orderNumber.length > 100) {
      throw new Error("Order number is too long");
    }

    const source = input.source?.trim() || "manual";

    if (source.length > 50) {
      throw new Error("Order source is too long");
    }

    const currency = input.currency?.trim().toUpperCase() || "INR";

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Invalid currency");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one order item is required");
    }

    for (const item of input.items) {
      if (!Number.isInteger(item.variantId) || item.variantId <= 0) {
        throw new Error("Invalid variant");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Invalid item quantity");
      }
    }

    const discount = input.discount ?? 0;
    const shippingFee = input.shippingFee ?? 0;
    const tax = input.tax ?? 0;

    if (!Number.isInteger(discount) || discount < 0) {
      throw new Error("Invalid discount");
    }

    if (!Number.isInteger(shippingFee) || shippingFee < 0) {
      throw new Error("Invalid shipping fee");
    }

    if (!Number.isInteger(tax) || tax < 0) {
      throw new Error("Invalid tax");
    }

    if (input.customerId !== undefined) {
      if (!Number.isInteger(input.customerId) || input.customerId <= 0) {
        throw new Error("Invalid customer");
      }
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Database and inventory logic will be added next.

      // 1. Validate customer ownership
      if (input.customerId !== undefined) {
        const customerResult = await client.query(
          `
      SELECT id
      FROM customers
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
    `,
          [input.customerId, userId],
        );

        if (customerResult.rowCount === 0) {
          throw new Error("Customer not found");
        }
      }

      // 2. Validate variant ownership
      const variants = new Map<
        number,
        {
          id: number;
          productId: number;
          productName: string;
          variantName: string | null;
          sku: string;
          price: number | null;
        }
      >();

      for (const item of input.items) {
        const variantResult = await client.query(
          `
      SELECT
        pv.id,
        pv.product_id,
        pv.name AS variant_name,
        pv.sku,
        pv.price,
        p.name AS product_name
      FROM product_variants pv
      INNER JOIN products p
        ON p.id = pv.product_id
      WHERE pv.id = $1
        AND p.user_id = $2
        AND p.status <> 'archived'
        AND pv.status <> 'archived'
      FOR UPDATE OF pv
    `,
          [item.variantId, userId],
        );

        if (variantResult.rowCount === 0) {
          throw new Error(`Variant ${item.variantId} not found`);
        }

        const variant = variantResult.rows[0];

        variants.set(item.variantId, {
          id: Number(variant.id),
          productId: Number(variant.product_id),
          productName: variant.product_name,
          variantName: variant.variant_name,
          sku: variant.sku,
          price: variant.price === null ? null : Number(variant.price),
        });
      }

      const mergedItems = new Map<
        number,
        {
          quantity: number;
          orderItemId?: number;
        }
      >();

      for (const item of input.items) {
        const current = mergedItems.get(item.variantId);

        const currentQuantity = current?.quantity ?? 0;

        const newQuantity = currentQuantity + item.quantity;

        if (!Number.isSafeInteger(newQuantity)) {
          throw new Error(
            `Quantity is too large for variant ${item.variantId}`,
          );
        }

        mergedItems.set(item.variantId, {
          quantity: newQuantity,
        });
      }

      let subtotal = 0;

      for (const [variantId, item] of mergedItems) {
        const variant = variants.get(variantId);

        if (!variant) {
          throw new Error(`Variant ${variantId} not found`);
        }

        if (variant.price === null) {
          throw new Error(`Variant ${variantId} does not have a price`);
        }

        const lineTotal = variant.price * item.quantity;

        if (!Number.isSafeInteger(lineTotal)) {
          throw new Error(
            `Order item total is too large for variant ${variantId}`,
          );
        }

        subtotal += lineTotal;

        if (!Number.isSafeInteger(subtotal)) {
          throw new Error("Order subtotal is too large");
        }
      }

      const total = subtotal - discount + shippingFee + tax;

      if (total < 0) {
        throw new Error("Order total cannot be negative");
      }

      const orderResult = await client.query(
        `
    INSERT INTO orders (
      user_id,
      customer_id,
      order_number,
      source,
      customer_name,
      customer_email,
      customer_phone,
      currency,
      subtotal,
      discount,
      shipping_fee,
      tax,
      total,
      payment_status,
      order_status,
      fulfillment_status,
      notes
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      'pending',
      'pending',
      'unfulfilled',
      $14
    )
    RETURNING id, order_number, total, currency
  `,
        [
          userId,
          input.customerId ?? null,
          input.orderNumber.trim(),
          source,
          input.customerName?.trim() || null,
          input.customerEmail?.trim() || null,
          input.customerPhone?.trim() || null,
          currency,
          subtotal,
          discount,
          shippingFee,
          tax,
          total,
          input.notes?.trim() || null,
        ],
      );

      const order = orderResult.rows[0];

      for (const [variantId, item] of mergedItems) {
        const quantity = item.quantity;

        const variant = variants.get(variantId);

        if (!variant) {
          throw new Error(`Variant ${variantId} not found`);
        }

        if (variant.price === null) {
          throw new Error(`Variant ${variantId} does not have a price`);
        }

        const lineTotal = variant.price * quantity;

        const itemResult = await client.query(
          `
      INSERT INTO order_items (
        order_id,
        product_id,
        variant_id,
        product_name,
        variant_name,
        sku,
        quantity,
        unit_price,
        discount,
        tax,
        total
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        0,
        0,
        $9
      )
      RETURNING id
    `,
          [
            order.id,
            variant.productId,
            variant.id,
            variant.productName,
            variant.variantName,
            variant.sku,
            quantity,
            variant.price,
            lineTotal,
          ],
        );

        item.orderItemId = Number(itemResult.rows[0].id);
      }

      for (const [variantId, item] of mergedItems) {
        const quantity = item.quantity;

        const orderItemId = item.orderItemId;

        if (!orderItemId) {
          throw new Error(`Order item not found for variant ${variantId}`);
        }

        const inventoryResult = await client.query(
          `
      SELECT
        ib.id,
        ib.location_id,
        ib.variant_id,
        ib.quantity_on_hand,
        ib.quantity_reserved
      FROM inventory_balances ib
      INNER JOIN inventory_locations il
        ON il.id = ib.location_id
      WHERE ib.variant_id = $1
        AND ib.user_id = $2
        AND il.status = 'active'
      ORDER BY ib.location_id
      FOR UPDATE
    `,
          [variantId, userId],
        );

        if (inventoryResult.rowCount === 0) {
          throw new Error(
            `No inventory location found for variant ${variantId}`,
          );
        }

        let remaining = quantity;

        for (const balance of inventoryResult.rows) {
          if (remaining <= 0) {
            break;
          }

          const onHand = Number(balance.quantity_on_hand);
          const reserved = Number(balance.quantity_reserved);
          const available = onHand - reserved;

          if (available <= 0) {
            continue;
          }

          const reserveQuantity = Math.min(remaining, available);

          await client.query(
            `
        UPDATE inventory_balances
        SET
          quantity_reserved = quantity_reserved + $1,
          updated_at = NOW()
        WHERE id = $2
      `,
            [reserveQuantity, balance.id],
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
      'reserved'
    )
  `,
            [order.id, orderItemId, balance.location_id, reserveQuantity],
          );

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
          'reserve',
          $4,
          'order',
          $5,
          $6
        )
      `,
            [
              userId,
              balance.location_id,
              variantId,
              reserveQuantity,
              order.id,
              `Reserved for order ${order.order_number}`,
            ],
          );

          remaining -= reserveQuantity;
        }

        if (remaining > 0) {
          throw new Error(
            `Insufficient available stock for variant ${variantId}`,
          );
        }
      }

      await client.query(
        `
    INSERT INTO order_status_history (
      order_id,
      status_type,
      old_status,
      new_status,
      source,
      note
    )
    VALUES (
      $1,
      'order',
      NULL,
      'pending',
      $2,
      'Order created'
    )
  `,
        [order.id, source],
      );

      await client.query("COMMIT");

      return {
        id: Number(order.id),
        orderNumber: order.order_number,
        total: Number(order.total),
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
  async cancelOrder(userId: number, orderId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("Invalid order");
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
        [orderId, userId],
      );

      if (orderResult.rowCount === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult.rows[0];

      // 2. Validate cancellation state
      if (order.order_status === "cancelled") {
        throw new Error("Order is already cancelled");
      }

      if (order.order_status === "completed") {
        throw new Error("Completed orders cannot be cancelled");
      }

      // 3. Lock all active reservations for this order
      const allocationResult = await client.query(
        `
        SELECT
          oia.id,
          oia.order_item_id,
          oia.location_id,
          oia.quantity,
          oia.status,
          oi.variant_id
        FROM order_inventory_allocations oia
        INNER JOIN order_items oi
          ON oi.id = oia.order_item_id
        WHERE oia.order_id = $1
          AND oia.status = 'reserved'
        FOR UPDATE OF oia
        `,
        [orderId],
      );

      // 4. Release each inventory reservation
      for (const allocation of allocationResult.rows) {
        const allocationId = Number(allocation.id);
        const locationId = Number(allocation.location_id);
        const variantId = Number(allocation.variant_id);
        const quantity = Number(allocation.quantity);

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
          [locationId, variantId, userId],
        );

        if (balanceResult.rowCount === 0) {
          throw new Error(
            `Inventory balance not found for variant ${variantId} at location ${locationId}`,
          );
        }

        const balance = balanceResult.rows[0];

        const reserved = Number(balance.quantity_reserved);

        if (quantity > reserved) {
          throw new Error(`Invalid reservation for variant ${variantId}`);
        }

        // Release reservation
        await client.query(
          `
          UPDATE inventory_balances
          SET
            quantity_reserved = quantity_reserved - $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [quantity, balance.id],
        );

        // Record inventory movement
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
            'release',
            $4,
            'order',
            $5,
            $6
          )
          `,
          [
            userId,
            locationId,
            variantId,
            -quantity,
            order.id,
            `Released reservation for cancelled order ${order.order_number}`,
          ],
        );

        // Mark allocation as released
        await client.query(
          `
          UPDATE order_inventory_allocations
          SET
            status = 'released',
            updated_at = NOW()
          WHERE id = $1
          `,
          [allocationId],
        );
      }

      // 5. Cancel order
      await client.query(
        `
        UPDATE orders
        SET
          order_status = 'cancelled',
          fulfillment_status = 'unfulfilled',
          updated_at = NOW()
        WHERE id = $1
        `,
        [orderId],
      );

      // 6. Record order status history
      await client.query(
        `
        INSERT INTO order_status_history (
          order_id,
          status_type,
          old_status,
          new_status,
          source,
          note
        )
        VALUES (
          $1,
          'order',
          $2,
          'cancelled',
          'system',
          'Order cancelled and inventory reservations released'
        )
        `,
        [orderId, order.order_status],
      );

      await client.query("COMMIT");

      return {
        id: Number(order.id),
        orderNumber: order.order_number,
        orderStatus: "cancelled",
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
  async updateOrderStatus(
    userId: number,
    orderId: number,
    newStatus: "pending" | "confirmed" | "processing" | "completed",
  ) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user");
    }

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("Invalid order");
    }

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "completed",
    ] as const;

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error("Invalid order status");
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
          order_status
        FROM orders
        WHERE id = $1
          AND user_id = $2
        FOR UPDATE
        `,
        [orderId, userId],
      );

      if (orderResult.rowCount === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult.rows[0];

      const currentStatus = order.order_status as
        | "pending"
        | "confirmed"
        | "processing"
        | "completed"
        | "cancelled";

      // 2. No-op protection
      if (currentStatus === newStatus) {
        throw new Error(`Order is already ${newStatus}`);
      }

      // 3. Validate transition
      const allowedTransitions: Record<
        typeof currentStatus,
        readonly string[]
      > = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["completed", "cancelled"],
        completed: [],
        cancelled: [],
      };

      if (!allowedTransitions[currentStatus].includes(newStatus)) {
        throw new Error(
          `Cannot change order status from ${currentStatus} to ${newStatus}`,
        );
      }

      // 3. Update order status
      await client.query(
        `
        UPDATE orders
        SET
          order_status = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [newStatus, orderId],
      );

      // 4. Record status history
      await client.query(
        `
        INSERT INTO order_status_history (
          order_id,
          status_type,
          old_status,
          new_status,
          source,
          note
        )
        VALUES (
          $1,
          'order',
          $2,
          $3,
          'system',
          'Order status updated'
        )
        `,
        [orderId, currentStatus, newStatus],
      );

      await client.query("COMMIT");

      return {
        id: Number(order.id),
        orderNumber: order.order_number,
        oldStatus: currentStatus,
        newStatus,
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
