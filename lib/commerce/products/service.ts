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
