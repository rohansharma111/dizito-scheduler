import { pool } from "@/lib/db";

export async function getProductMedia(productId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      pm.id,
      pm.product_id,
      pm.media_id,
      pm.sort_order,
      pm.is_primary,
      pm.created_at,

      ml.cloudinary_public_id,
      ml.original_name,
      ml.file_name,
      ml.secure_url,
      ml.format,
      ml.mime_type,
      ml.width,
      ml.height,
      ml.bytes,
      ml.resource_type,
      ml.folder,
      ml.tags

    FROM product_media pm

    INNER JOIN products p
      ON p.id = pm.product_id

    INNER JOIN media_library ml
      ON ml.id = pm.media_id

    WHERE pm.product_id = $1
      AND p.user_id = $2
      AND ml.user_id = $2
      AND ml.deleted_at IS NULL

    ORDER BY
      pm.sort_order ASC,
      pm.created_at ASC
    `,
    [productId, userId],
  );

  return result.rows;
}

export async function attachMediaToProduct(
  productId: string,
  mediaId: number,
  userId: number,
  sortOrder = 0,
  isPrimary = false,
) {
  /*
    Verify that the product belongs to the user.
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

  /*
    Verify that the media belongs to the same user
    and hasn't been deleted.
  */
  const mediaResult = await pool.query(
    `
    SELECT id
    FROM media_library
    WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [mediaId, userId],
  );

  if (mediaResult.rows.length === 0) {
    return {
      error: "MEDIA_NOT_FOUND",
    };
  }

  /*
    Prevent more than one primary image.
    If this image is being made primary,
    remove the primary flag from existing images.
  */
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isPrimary) {
      await client.query(
        `
        UPDATE product_media
        SET is_primary = false
        WHERE product_id = $1
        `,
        [productId],
      );
    }

    const result = await client.query(
      `
      INSERT INTO product_media
      (
        product_id,
        media_id,
        sort_order,
        is_primary
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
        product_id,
        media_id,
        sort_order,
        is_primary,
        created_at
      `,
      [productId, mediaId, sortOrder, isPrimary],
    );

    await client.query("COMMIT");

    return {
      media: result.rows[0],
    };
  } catch (error: any) {
    await client.query("ROLLBACK");

    /*
      PostgreSQL unique violation:
      this media is already attached to this product.
    */
    if (error?.code === "23505") {
      return {
        error: "MEDIA_ALREADY_ATTACHED",
      };
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function updateProductMedia(
  productId: string,
  productMediaId: string,
  userId: number,
  input: {
    sortOrder?: number;
    isPrimary?: boolean;
  },
) {
  /*
    Verify ownership through the product.
  */
  const existingResult = await pool.query(
    `
    SELECT
      pm.id,
      pm.sort_order,
      pm.is_primary
    FROM product_media pm
    INNER JOIN products p
      ON p.id = pm.product_id
    WHERE pm.id = $1
      AND pm.product_id = $2
      AND p.user_id = $3
    LIMIT 1
    `,
    [productMediaId, productId, userId],
  );

  if (existingResult.rows.length === 0) {
    return {
      error: "PRODUCT_MEDIA_NOT_FOUND",
    };
  }

  const existing = existingResult.rows[0];

  const sortOrder =
    input.sortOrder !== undefined ? input.sortOrder : existing.sort_order;

  const isPrimary =
    input.isPrimary !== undefined ? input.isPrimary : existing.is_primary;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isPrimary) {
      await client.query(
        `
        UPDATE product_media
        SET is_primary = false
        WHERE product_id = $1
          AND id <> $2
        `,
        [productId, productMediaId],
      );
    }

    const result = await client.query(
      `
      UPDATE product_media
      SET
        sort_order = $1,
        is_primary = $2
      WHERE id = $3
        AND product_id = $4
      RETURNING
        id,
        product_id,
        media_id,
        sort_order,
        is_primary,
        created_at
      `,
      [sortOrder, isPrimary, productMediaId, productId],
    );

    await client.query("COMMIT");

    return {
      media: result.rows[0] ?? null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeMediaFromProduct(
  productId: string,
  productMediaId: string,
  userId: number,
) {
  const result = await pool.query(
    `
    DELETE FROM product_media pm
    USING products p
    WHERE pm.id = $1
      AND pm.product_id = $2
      AND p.id = pm.product_id
      AND p.user_id = $3
    RETURNING pm.id
    `,
    [productMediaId, productId, userId],
  );

  return result.rows[0] ?? null;
}
