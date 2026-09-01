import { pool } from "@/lib/db";

export interface CreateVariantInput {
  name?: string | null;
  sku: string;
  barcode?: string | null;
  price?: number | null;
  mrp?: number | null;
  costPrice?: number | null;
  weight?: number | null;
}

export interface UpdateVariantInput {
  name?: string | null;
  sku?: string;
  barcode?: string | null;
  price?: number | null;
  mrp?: number | null;
  costPrice?: number | null;
  weight?: number | null;
  status?: string;
}

export async function getVariants(productId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      pv.id,
      pv.product_id,
      pv.name,
      pv.sku,
      pv.barcode,
      pv.price,
      pv.mrp,
      pv.cost_price,
      pv.weight,
      pv.status,
      pv.created_at,
      pv.updated_at
    FROM product_variants pv
    INNER JOIN products p
      ON p.id = pv.product_id
    WHERE pv.product_id = $1
      AND p.user_id = $2
    ORDER BY pv.created_at ASC
    `,
    [productId, userId],
  );

  return result.rows;
}

export async function getVariantById(
  productId: string,
  variantId: string,
  userId: number,
) {
  const result = await pool.query(
    `
    SELECT
      pv.id,
      pv.product_id,
      pv.name,
      pv.sku,
      pv.barcode,
      pv.price,
      pv.mrp,
      pv.cost_price,
      pv.weight,
      pv.status,
      pv.created_at,
      pv.updated_at
    FROM product_variants pv
    INNER JOIN products p
      ON p.id = pv.product_id
    WHERE pv.id = $1
      AND pv.product_id = $2
      AND p.user_id = $3
    LIMIT 1
    `,
    [variantId, productId, userId],
  );

  return result.rows[0] ?? null;
}

export async function createVariant(
  productId: string,
  userId: number,
  input: CreateVariantInput,
) {
  /*
    Verify that the product belongs to the
    authenticated user before inserting.
  */
  const productResult = await pool.query(
    `
    SELECT id
    FROM products
    WHERE id = $1
      AND user_id = $2
    LIMIT 1
    `,
    [productId, userId],
  );

  if (productResult.rows.length === 0) {
    return {
      error: "PRODUCT_NOT_FOUND",
    };
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO product_variants
      (
        product_id,
        name,
        sku,
        barcode,
        price,
        mrp,
        cost_price,
        weight
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
      RETURNING
        id,
        product_id,
        name,
        sku,
        barcode,
        price,
        mrp,
        cost_price,
        weight,
        status,
        created_at,
        updated_at
      `,
      [
        productId,
        input.name ?? null,
        input.sku,
        input.barcode ?? null,
        input.price ?? null,
        input.mrp ?? null,
        input.costPrice ?? null,
        input.weight ?? null,
      ],
    );

    return {
      variant: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        error: "SKU_ALREADY_EXISTS",
      };
    }

    throw error;
  }
}

export async function updateVariant(
  productId: string,
  variantId: string,
  userId: number,
  input: UpdateVariantInput,
) {
  const existing = await getVariantById(productId, variantId, userId);

  if (!existing) {
    return {
      error: "VARIANT_NOT_FOUND",
    };
  }

  const name = input.name !== undefined ? input.name : existing.name;

  const sku = input.sku !== undefined ? input.sku : existing.sku;

  const barcode =
    input.barcode !== undefined ? input.barcode : existing.barcode;

  const price = input.price !== undefined ? input.price : existing.price;

  const mrp = input.mrp !== undefined ? input.mrp : existing.mrp;

  const costPrice =
    input.costPrice !== undefined ? input.costPrice : existing.cost_price;

  const weight = input.weight !== undefined ? input.weight : existing.weight;

  const status = input.status !== undefined ? input.status : existing.status;

  try {
    const result = await pool.query(
      `
      UPDATE product_variants
      SET
        name = $1,
        sku = $2,
        barcode = $3,
        price = $4,
        mrp = $5,
        cost_price = $6,
        weight = $7,
        status = $8,
        updated_at = now()
      WHERE id = $9
        AND product_id = $10
      RETURNING
        id,
        product_id,
        name,
        sku,
        barcode,
        price,
        mrp,
        cost_price,
        weight,
        status,
        created_at,
        updated_at
      `,
      [
        name,
        sku,
        barcode,
        price,
        mrp,
        costPrice,
        weight,
        status,
        variantId,
        productId,
      ],
    );

    return {
      variant: result.rows[0] ?? null,
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        error: "SKU_ALREADY_EXISTS",
      };
    }

    throw error;
  }
}

export async function deleteVariant(
  productId: string,
  variantId: string,
  userId: number,
) {
  const existing = await getVariantById(productId, variantId, userId);

  if (!existing) {
    return {
      error: "VARIANT_NOT_FOUND",
    };
  }

  const result = await pool.query(
    `
    DELETE FROM product_variants
    WHERE id = $1
      AND product_id = $2
    RETURNING id
    `,
    [variantId, productId],
  );

  return {
    deleted: result.rows[0] ?? null,
  };
}
