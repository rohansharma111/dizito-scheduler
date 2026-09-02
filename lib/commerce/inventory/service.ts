import { pool } from "@/lib/db";

export async function getLocations(userId: number) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      type,
      status,
      address,
      created_at,
      updated_at
    FROM inventory_locations
    WHERE user_id = $1
    ORDER BY created_at ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function createLocation(
  userId: number,
  input: {
    name: string;
    type?: string;
    address?: string | null;
  },
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Location name is required.");
  }

  const type = input.type?.trim() || "warehouse";

  const result = await pool.query(
    `
    INSERT INTO inventory_locations
    (
      user_id,
      name,
      type,
      address
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4
    )
    RETURNING
      id,
      name,
      type,
      status,
      address,
      created_at,
      updated_at
    `,
    [userId, name, type, input.address?.trim() || null],
  );

  return result.rows[0];
}

export async function getInventory(
  userId: number,
  options?: {
    locationId?: number;
    search?: string;
  },
) {
  const values: any[] = [userId];

  const conditions = [`ib.user_id = $1`];

  if (options?.locationId) {
    values.push(options.locationId);

    conditions.push(`ib.location_id = $${values.length}`);
  }

  if (options?.search?.trim()) {
    values.push(`%${options.search.trim()}%`);

    conditions.push(
      `
      (
        p.name ILIKE $${values.length}
        OR pv.name ILIKE $${values.length}
        OR pv.sku ILIKE $${values.length}
      )
      `,
    );
  }

  const result = await pool.query(
    `
    SELECT
      ib.id,

      ib.location_id,
      il.name AS location_name,

      ib.variant_id,

      pv.name AS variant_name,
      pv.sku,

      p.id AS product_id,
      p.name AS product_name,

      ib.quantity_on_hand,
      ib.quantity_reserved,

      (
        ib.quantity_on_hand
        - ib.quantity_reserved
      ) AS quantity_available,

      ib.created_at,
      ib.updated_at

    FROM inventory_balances ib

    INNER JOIN inventory_locations il
      ON il.id = ib.location_id

    INNER JOIN product_variants pv
      ON pv.id = ib.variant_id

    INNER JOIN products p
      ON p.id = pv.product_id

    WHERE ${conditions.join(" AND ")}

    ORDER BY
      p.name ASC,
      pv.name ASC,
      il.name ASC
    `,
    values,
  );

  return result.rows;
}

export async function getInventoryVariants(userId: number) {
  const result = await pool.query(
    `
    SELECT
      pv.id AS variant_id,
      pv.name AS variant_name,
      pv.sku,
      p.id AS product_id,
      p.name AS product_name

    FROM product_variants pv

    INNER JOIN products p
      ON p.id = pv.product_id

    WHERE p.user_id = $1
      AND pv.status != 'archived'
      AND p.status != 'archived'

    ORDER BY
      p.name ASC,
      pv.name ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function addStock(
  userId: number,
  input: {
    variantId: number;
    locationId: number;
    quantity: number;
    movementType?: string;
    referenceType?: string | null;
    referenceId?: number | null;
    note?: string | null;
  },
) {
  const quantity = Math.trunc(input.quantity);

  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
      Verify location ownership
    */

    const locationResult = await client.query(
      `
        SELECT id
        FROM inventory_locations
        WHERE id = $1
          AND user_id = $2
          AND status = 'active'
        `,
      [input.locationId, userId],
    );

    if (locationResult.rows.length === 0) {
      throw new Error("Invalid inventory location.");
    }

    /*
      Verify variant ownership
    */

    const variantResult = await client.query(
      `
        SELECT pv.id
        FROM product_variants pv

        INNER JOIN products p
          ON p.id = pv.product_id

        WHERE pv.id = $1
          AND p.user_id = $2
        `,
      [input.variantId, userId],
    );

    if (variantResult.rows.length === 0) {
      throw new Error("Invalid product variant.");
    }

    /*
      Create balance if it doesn't exist.
    */

    await client.query(
      `
      INSERT INTO inventory_balances
      (
        user_id,
        location_id,
        variant_id,
        quantity_on_hand,
        quantity_reserved
      )
      VALUES
      (
        $1,
        $2,
        $3,
        0,
        0
      )
      ON CONFLICT
        (location_id, variant_id)
      DO NOTHING
      `,
      [userId, input.locationId, input.variantId],
    );

    const balanceResult = await client.query(
      `
    SELECT
      id,
      location_id,
      variant_id,
      quantity_on_hand,
      quantity_reserved,
      created_at,
      updated_at
    FROM inventory_balances
    WHERE location_id = $1
      AND variant_id = $2
      AND user_id = $3
    FOR UPDATE
    `,
      [input.locationId, input.variantId, userId],
    );

    if (balanceResult.rows.length === 0) {
      throw new Error("Inventory balance not found.");
    }

    const currentBalance = balanceResult.rows[0];

    /*
      Update balance.
    */

    const updatedBalanceResult = await client.query(
      `
    UPDATE inventory_balances
    SET
      quantity_on_hand =
        quantity_on_hand + $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING
      id,
      location_id,
      variant_id,
      quantity_on_hand,
      quantity_reserved,
      created_at,
      updated_at
    `,
      [quantity, currentBalance.id],
    );

    if (updatedBalanceResult.rows.length === 0) {
      throw new Error("Failed to update inventory.");
    }

    /*
      Record movement.
    */

    const movementResult = await client.query(
      `
        INSERT INTO inventory_movements
        (
          user_id,
          location_id,
          variant_id,
          movement_type,
          quantity,
          reference_type,
          reference_id,
          note
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING *
        `,
      [
        userId,
        input.locationId,
        input.variantId,
        input.movementType || "adjustment",
        quantity,
        input.referenceType || null,
        input.referenceId || null,
        input.note?.trim() || null,
      ],
    );

    await client.query("COMMIT");

    return {
      balance: balanceResult.rows[0],
      movement: movementResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeStock(
  userId: number,
  input: {
    locationId: number;
    variantId: number;
    quantity: number;
    reason?: string;
    note?: string;
  }
) {
  const { locationId, variantId, quantity, reason, note } = input;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify location belongs to this user and is active
    const locationResult = await client.query(
      `
      SELECT id
      FROM inventory_locations
      WHERE id = $1
        AND user_id = $2
        AND status = 'active'
      `,
      [locationId, userId]
    );

    if (locationResult.rowCount === 0) {
      throw new Error("Inventory location not found");
    }

    // Verify variant belongs to this user
    const variantResult = await client.query(
      `
      SELECT pv.id
      FROM product_variants pv
      INNER JOIN products p
        ON p.id = pv.product_id
      WHERE pv.id = $1
        AND p.user_id = $2
        AND pv.status != 'archived'
        AND p.status != 'archived'
      `,
      [variantId, userId]
    );

    if (variantResult.rowCount === 0) {
      throw new Error("Product variant not found");
    }

    // Lock the balance row before checking/updating stock.
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
      [locationId, variantId, userId]
    );

    if (balanceResult.rowCount === 0) {
      throw new Error("No inventory exists for this variant at this location");
    }

    const balance = balanceResult.rows[0];

    const available =
      Number(balance.quantity_on_hand) -
      Number(balance.quantity_reserved);

    if (quantity > available) {
      throw new Error(
        `Insufficient available stock. Available: ${available}`
      );
    }

    // Remove physical stock.
    await client.query(
      `
      UPDATE inventory_balances
      SET
        quantity_on_hand = quantity_on_hand - $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [quantity, balance.id]
    );

    // Record the stock movement.
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
      VALUES ($1, $2, $3, 'out', $4, $5, $6, $7)
      `,
      [
        userId,
        locationId,
        variantId,
        -quantity,
        "manual",
        null,
        reason ? `${reason}${note ? ` - ${note}` : ""}` : note || null,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      quantityRemoved: quantity,
      quantityOnHand: Number(balance.quantity_on_hand) - quantity,
      quantityReserved: Number(balance.quantity_reserved),
      quantityAvailable: available - quantity,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
