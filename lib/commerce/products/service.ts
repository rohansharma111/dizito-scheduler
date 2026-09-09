import { pool } from "@/lib/db";

export interface CreateProductInput {
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  status?: string;
}

export async function getProducts(userId: number) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      description,
      brand,
      category,
      status,
      created_at,
      updated_at
    FROM products
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function getProductDetails(productId: string, userId: number) {
  const product = await getProductById(productId, userId);

  if (!product) {
    return null;
  }

  const variantsResult = await pool.query(
    `
    SELECT
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
    FROM product_variants
    WHERE product_id = $1
    ORDER BY created_at ASC
    `,
    [productId],
  );

  const mediaResult = await pool.query(
    `
    SELECT
      pm.id,
      pm.id AS product_media_id,
      pm.media_id,
      pm.sort_order,
      pm.is_primary,

      ml.original_name,
      ml.file_name,
      ml.secure_url,
      ml.format,
      ml.mime_type,
      ml.width,
      ml.height,
      ml.resource_type

    FROM product_media pm

    INNER JOIN media_library ml
      ON ml.id = pm.media_id

    WHERE pm.product_id = $1
      AND ml.deleted_at IS NULL

    ORDER BY
      pm.sort_order ASC,
      pm.created_at ASC
    `,
    [productId],
  );

  return {
    ...product,

    variants: variantsResult.rows,

    media: mediaResult.rows,
  };
}

export async function getProductById(productId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      description,
      brand,
      category,
      status,
      created_at,
      updated_at
    FROM products
    WHERE id = $1
      AND user_id = $2
    LIMIT 1
    `,
    [productId, userId],
  );

  return result.rows[0] ?? null;
}

export async function createProduct(userId: number, input: CreateProductInput) {
  const result = await pool.query(
    `
    INSERT INTO products
    (
      user_id,
      name,
      description,
      brand,
      category
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5
    )
    RETURNING
      id,
      name,
      description,
      brand,
      category,
      status,
      created_at,
      updated_at
    `,
    [
      userId,
      input.name,
      input.description ?? null,
      input.brand ?? null,
      input.category ?? null,
    ],
  );

  return result.rows[0];
}

export async function updateProduct(
  productId: string,
  userId: number,
  input: UpdateProductInput,
) {
  const existing = await getProductById(productId, userId);

  if (!existing) {
    return null;
  }

  const name = input.name !== undefined ? input.name : existing.name;

  const description =
    input.description !== undefined ? input.description : existing.description;

  const brand = input.brand !== undefined ? input.brand : existing.brand;

  const category =
    input.category !== undefined ? input.category : existing.category;

  const status = input.status !== undefined ? input.status : existing.status;

  const result = await pool.query(
    `
    UPDATE products
    SET
      name = $1,
      description = $2,
      brand = $3,
      category = $4,
      status = $5,
      updated_at = now()
    WHERE id = $6
      AND user_id = $7
    RETURNING
      id,
      name,
      description,
      brand,
      category,
      status,
      created_at,
      updated_at
    `,
    [name, description, brand, category, status, productId, userId],
  );

  return result.rows[0] ?? null;
}

export async function deleteProduct(productId: string, userId: number) {
  const result = await pool.query(
    `
    DELETE FROM products
    WHERE id = $1
      AND user_id = $2
    RETURNING id
    `,
    [productId, userId],
  );

  return result.rows[0] ?? null;
}
