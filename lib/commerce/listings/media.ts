import { pool } from "@/lib/db";

export async function getProductListingMedia(listingId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      plm.id,
      plm.listing_id,
      plm.product_media_id,
      plm.external_id,
      plm.sync_status,
      plm.provider_metadata,
      plm.created_at,
      plm.updated_at,
      pm.media_id,
      pm.sort_order,
      pm.is_primary,
      ml.original_name,
      ml.secure_url,
      ml.resource_type
    FROM product_listing_media plm
    INNER JOIN product_listings pl
      ON pl.id = plm.listing_id
    INNER JOIN product_media pm
      ON pm.id = plm.product_media_id
    INNER JOIN media_library ml
      ON ml.id = pm.media_id
    WHERE plm.listing_id = $1
      AND pl.user_id = $2
      AND ml.deleted_at IS NULL
    ORDER BY pm.sort_order ASC, pm.created_at ASC
    `,
    [listingId, userId],
  );

  return result.rows;
}

export async function upsertProductListingMedia(
  listingId: string,
  userId: number,
  input: {
    productMediaId: string;
    externalId?: string | null;
    syncStatus?: "pending" | "syncing" | "synced" | "error";
    providerMetadata?: Record<string, unknown>;
  },
) {
  const ownership = await pool.query(
    `
    SELECT pl.id
    FROM product_listings pl
    INNER JOIN product_media pm
      ON pm.product_id = pl.product_id
    INNER JOIN products p
      ON p.id = pl.product_id
    WHERE pl.id = $1
      AND pm.id = $2
      AND pl.user_id = $3
      AND p.user_id = $3
    LIMIT 1
    `,
    [listingId, input.productMediaId, userId],
  );

  if (ownership.rows.length === 0) {
    return { error: "LISTING_MEDIA_NOT_FOUND" as const };
  }

  const existing = await pool.query(
    `
    SELECT external_id, provider_metadata
    FROM product_listing_media
    WHERE listing_id = $1
      AND product_media_id = $2
    LIMIT 1
    `,
    [listingId, input.productMediaId],
  );

  const current = existing.rows[0];
  const externalId =
    input.externalId !== undefined ? input.externalId : current?.external_id ?? null;

  if (externalId) {
    const conflict = await pool.query(
      `
      SELECT id
      FROM product_listing_media
      WHERE listing_id = $1
        AND external_id = $2
        AND product_media_id <> $3
      LIMIT 1
      `,
      [listingId, externalId, input.productMediaId],
    );

    if (conflict.rows[0]) {
      return { error: "LISTING_MEDIA_EXTERNAL_ID_CONFLICT" as const };
    }
  }

  const providerMetadata = {
    ...(current?.provider_metadata ?? {}),
    ...(input.providerMetadata ?? {}),
  };

  const result = await pool.query(
    `
    INSERT INTO product_listing_media
      (listing_id, product_media_id, external_id, sync_status, provider_metadata)
    VALUES
      ($1, $2, $3, $4::varchar(20), $5::jsonb)
    ON CONFLICT (listing_id, product_media_id)
    DO UPDATE SET
      external_id = EXCLUDED.external_id,
      sync_status = EXCLUDED.sync_status,
      provider_metadata = EXCLUDED.provider_metadata,
      updated_at = now()
    RETURNING
      id,
      listing_id,
      product_media_id,
      external_id,
      sync_status,
      provider_metadata,
      created_at,
      updated_at
    `,
    [
      listingId,
      input.productMediaId,
      input.externalId ?? null,
      input.syncStatus ?? "pending",
      JSON.stringify(input.providerMetadata ?? {}),
    ],
  );

  return { listingMedia: result.rows[0] ?? null };
}
