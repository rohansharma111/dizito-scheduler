import { pool } from "@/lib/db";

export type ProductListingStatus = "draft" | "active" | "paused" | "archived";
export type ProductListingSyncStatus = "pending" | "syncing" | "synced" | "error";

export interface CreateProductListingInput {
  channelId: string;
  productId: string;
  status?: ProductListingStatus;
}

export interface UpdateProductListingInput {
  status?: ProductListingStatus;
}

export interface UpsertProductListingVariantInput {
  variantId: string;
  externalId?: string | null;
  syncStatus?: ProductListingSyncStatus;
  providerMetadata?: Record<string, unknown>;
}

async function verifyChannelOwnership(channelId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT id
    FROM commerce_channels
    WHERE id = $1 AND user_id = $2
    LIMIT 1
    `,
    [channelId, userId],
  );

  return result.rows[0] ?? null;
}

async function verifyProductOwnership(productId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT id
    FROM products
    WHERE id = $1 AND user_id = $2
    LIMIT 1
    `,
    [productId, userId],
  );

  return result.rows[0] ?? null;
}

export async function getProductListings(userId: number) {
  const result = await pool.query(
    `
    SELECT
      pl.id,
      pl.channel_id,
      pl.product_id,
      pl.status,
      pl.sync_status,
      pl.external_id,
      pl.last_synced_at,
      pl.last_error,
      pl.provider_metadata,
      pl.created_at,
      pl.updated_at,
      cc.provider,
      cc.name AS channel_name,
      p.name AS product_name
    FROM product_listings pl
    INNER JOIN commerce_channels cc
      ON cc.id = pl.channel_id
     AND cc.user_id = $1
    INNER JOIN products p
      ON p.id = pl.product_id
     AND p.user_id = $1
    WHERE pl.user_id = $1
    ORDER BY pl.created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function getProductListingById(listingId: string, userId: number) {
  const result = await pool.query(
    `
    SELECT
      pl.id,
      pl.channel_id,
      pl.product_id,
      pl.status,
      pl.sync_status,
      pl.external_id,
      pl.last_synced_at,
      pl.last_error,
      pl.provider_metadata,
      pl.created_at,
      pl.updated_at,
      cc.provider,
      cc.name AS channel_name,
      p.name AS product_name
    FROM product_listings pl
    INNER JOIN commerce_channels cc
      ON cc.id = pl.channel_id
     AND cc.user_id = $2
    INNER JOIN products p
      ON p.id = pl.product_id
     AND p.user_id = $2
    WHERE pl.id = $1
      AND pl.user_id = $2
    LIMIT 1
    `,
    [listingId, userId],
  );

  return result.rows[0] ?? null;
}

export async function createProductListing(
  userId: number,
  input: CreateProductListingInput,
) {
  const channel = await verifyChannelOwnership(input.channelId, userId);
  if (!channel) return { error: "CHANNEL_NOT_FOUND" as const };

  const product = await verifyProductOwnership(input.productId, userId);
  if (!product) return { error: "PRODUCT_NOT_FOUND" as const };

  try {
    const result = await pool.query(
      `
      INSERT INTO product_listings
        (user_id, channel_id, product_id, status)
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        id,
        channel_id,
        product_id,
        status,
        sync_status,
        external_id,
        last_synced_at,
        last_error,
        provider_metadata,
        created_at,
        updated_at
      `,
      [
        userId,
        input.channelId,
        input.productId,
        input.status ?? "draft",
      ],
    );

    return { listing: result.rows[0] };
  } catch (error: any) {
    if (error?.code === "23505") {
      return { error: "LISTING_ALREADY_EXISTS" as const };
    }

    throw error;
  }
}

export async function updateProductListing(
  listingId: string,
  userId: number,
  input: UpdateProductListingInput,
) {
  const existing = await getProductListingById(listingId, userId);
  if (!existing) return { error: "LISTING_NOT_FOUND" as const };

  const result = await pool.query(
    `
    UPDATE product_listings
    SET
      status = $1,
      updated_at = now()
    WHERE id = $2
      AND user_id = $3
    RETURNING
      id,
      channel_id,
      product_id,
      status,
      sync_status,
      external_id,
      last_synced_at,
      last_error,
      provider_metadata,
      created_at,
      updated_at
    `,
    [input.status ?? existing.status, listingId, userId],
  );

  return { listing: result.rows[0] ?? null };
}

export async function getProductListingVariants(
  listingId: string,
  userId: number,
) {
  const result = await pool.query(
    `
    SELECT
      plv.id,
      plv.listing_id,
      plv.variant_id,
      plv.external_id,
      plv.sync_status,
      plv.provider_metadata,
      plv.created_at,
      plv.updated_at
    FROM product_listing_variants plv
    INNER JOIN product_listings pl
      ON pl.id = plv.listing_id
     AND pl.user_id = $2
    INNER JOIN product_variants pv
      ON pv.id = plv.variant_id
     AND pv.product_id = pl.product_id
    WHERE plv.listing_id = $1
    ORDER BY pv.created_at ASC
    `,
    [listingId, userId],
  );

  return result.rows;
}

export async function upsertProductListingVariant(
  listingId: string,
  userId: number,
  input: UpsertProductListingVariantInput,
) {
  const listing = await getProductListingById(listingId, userId);
  if (!listing) return { error: "LISTING_NOT_FOUND" as const };

  const variant = await pool.query(
    `
    SELECT id
    FROM product_variants
    WHERE id = $1
      AND product_id = $2
    LIMIT 1
    `,
    [input.variantId, listing.product_id],
  );

  if (variant.rows.length === 0) {
    return { error: "VARIANT_NOT_FOUND" as const };
  }

  const result = await pool.query(
    `
    INSERT INTO product_listing_variants
      (listing_id, variant_id, external_id, sync_status, provider_metadata)
    VALUES
      ($1, $2, $3, $4, $5::jsonb)
    ON CONFLICT (listing_id, variant_id)
    DO UPDATE SET
      external_id = EXCLUDED.external_id,
      sync_status = EXCLUDED.sync_status,
      provider_metadata = EXCLUDED.provider_metadata,
      updated_at = now()
    RETURNING
      id,
      listing_id,
      variant_id,
      external_id,
      sync_status,
      provider_metadata,
      created_at,
      updated_at
    `,
    [
      listingId,
      input.variantId,
      input.externalId ?? null,
      input.syncStatus ?? "pending",
      JSON.stringify(input.providerMetadata ?? {}),
    ],
  );

  return { listingVariant: result.rows[0] };
}
