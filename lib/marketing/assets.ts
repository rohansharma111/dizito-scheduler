import { pool } from "@/lib/db";

export async function listMarketingAssets(userId: number, assetType?: string) {
  const values: unknown[] = [userId];
  let typeClause = "";
  if (assetType) {
    values.push(assetType);
    typeClause = "AND m.asset_type = $2";
  }

  const result = await pool.query(
    `SELECT
       ml.*,
       m.asset_type,
       m.description AS asset_description,
       m.ai_context,
       COALESCE(
         json_agg(DISTINCT map.product_id) FILTER (WHERE map.product_id IS NOT NULL),
         '[]'
       ) AS product_ids
     FROM media_library ml
     LEFT JOIN marketing_asset_metadata m
       ON m.media_id = ml.id AND m.user_id = $1
     LEFT JOIN marketing_asset_products map ON map.media_id = ml.id
     WHERE ml.user_id = $1
       AND ml.deleted_at IS NULL
       ${typeClause}
     GROUP BY ml.id, m.media_id
     ORDER BY ml.created_at DESC`,
    values,
  );
  return result.rows;
}

export async function getMarketingAsset(userId: number, mediaId: number) {
  const result = await pool.query(
    `SELECT
       ml.*,
       COALESCE(m.asset_type, 'general') AS asset_type,
       m.description AS asset_description,
       m.ai_context,
       COALESCE(
         json_agg(DISTINCT map.product_id) FILTER (WHERE map.product_id IS NOT NULL),
         '[]'
       ) AS product_ids
     FROM media_library ml
     LEFT JOIN marketing_asset_metadata m
       ON m.media_id = ml.id AND m.user_id = $1
     LEFT JOIN marketing_asset_products map ON map.media_id = ml.id
     WHERE ml.id = $2 AND ml.user_id = $1 AND ml.deleted_at IS NULL
     GROUP BY ml.id, m.media_id`,
    [userId, mediaId],
  );
  return result.rows[0] ?? null;
}
