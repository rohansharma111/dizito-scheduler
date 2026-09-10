import { pool } from "@/lib/db";

export interface ProductListingDraftVariantInput {
  variantId: string;
  externalId?: string | null;
  providerMetadata?: Record<string, unknown>;
}

export interface UpsertProductListingDraftInput {
  channelId: string;
  productId: string;
  providerMetadata?: Record<string, unknown>;
  variants: ProductListingDraftVariantInput[];
}

export async function upsertProductListingDraft(
  userId: number,
  input: UpsertProductListingDraftInput,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const channelResult = await client.query(
      `
      SELECT id
      FROM commerce_channels
      WHERE id = $1 AND user_id = $2
      LIMIT 1
      `,
      [input.channelId, userId],
    );

    if (!channelResult.rows[0]) {
      await client.query("ROLLBACK");
      return { error: "CHANNEL_NOT_FOUND" as const };
    }

    const productResult = await client.query(
      `
      SELECT id
      FROM products
      WHERE id = $1 AND user_id = $2
      LIMIT 1
      `,
      [input.productId, userId],
    );

    if (!productResult.rows[0]) {
      await client.query("ROLLBACK");
      return { error: "PRODUCT_NOT_FOUND" as const };
    }

    const variantIds = [...new Set(input.variants.map((variant) => variant.variantId))];
    if (variantIds.length === 0) {
      await client.query("ROLLBACK");
      return { error: "VARIANTS_REQUIRED" as const };
    }

    const variantsResult = await client.query(
      `
      SELECT id
      FROM product_variants
      WHERE product_id = $1
        AND id = ANY($2::bigint[])
      `,
      [input.productId, variantIds],
    );

    if (variantsResult.rowCount !== variantIds.length) {
      await client.query("ROLLBACK");
      return { error: "VARIANT_NOT_FOUND" as const };
    }

    const existingResult = await client.query(
      `
      SELECT id, status, provider_metadata
      FROM product_listings
      WHERE product_id = $1 AND channel_id = $2
      LIMIT 1
      `,
      [input.productId, input.channelId],
    );

    let listing;
    const metadata = {
      ...(existingResult.rows[0]?.provider_metadata ?? {}),
      ...(input.providerMetadata ?? {}),
    };

    if (existingResult.rows[0]) {
      const result = await client.query(
        `
        UPDATE product_listings
        SET
          provider_metadata = $1::jsonb,
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
        [JSON.stringify(metadata), existingResult.rows[0].id, userId],
      );
      listing = result.rows[0];
    } else {
      const result = await client.query(
        `
        INSERT INTO product_listings
          (user_id, channel_id, product_id, status, provider_metadata)
        VALUES
          ($1, $2, $3, 'draft', $4::jsonb)
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
        [userId, input.channelId, input.productId, JSON.stringify(metadata)],
      );
      listing = result.rows[0];
    }

    for (const variant of input.variants) {
      const providerMetadata = variant.providerMetadata ?? {};
      await client.query(
        `
        INSERT INTO product_listing_variants
          (listing_id, variant_id, external_id, sync_status, provider_metadata)
        VALUES
          ($1, $2, $3, 'pending', $4::jsonb)
        ON CONFLICT (listing_id, variant_id)
        DO UPDATE SET
          external_id = EXCLUDED.external_id,
          provider_metadata = EXCLUDED.provider_metadata,
          updated_at = now()
        `,
        [listing.id, variant.variantId, variant.externalId ?? null, JSON.stringify(providerMetadata)],
      );
    }

    await client.query("COMMIT");
    return { listing };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
