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

    /*
      Update balance.
    */

    const balanceResult = await client.query(
      `
        UPDATE inventory_balances

        SET
          quantity_on_hand =
            quantity_on_hand + $1,

          updated_at = NOW()

        WHERE location_id = $2
          AND variant_id = $3
          AND user_id = $4

        RETURNING
          id,
          location_id,
          variant_id,
          quantity_on_hand,
          quantity_reserved,
          updated_at
        `,
      [quantity, input.locationId, input.variantId, userId],
    );

    if (balanceResult.rows.length === 0) {
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
