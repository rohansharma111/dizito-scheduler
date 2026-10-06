import { pool } from "@/lib/db";

export const MARKETING_PLATFORMS = ["facebook", "instagram", "linkedin", "pinterest", "google_business"] as const;
export type MarketingPlatform = (typeof MARKETING_PLATFORMS)[number];

export type MarketingContentVariant = {
  id: number;
  userId: number;
  contentItemId: number;
  platform: MarketingPlatform;
  hook: string | null;
  body: string | null;
  cta: string | null;
  mediaId: number | null;
  status: "draft" | "ready" | "converted" | "archived";
  createdAt: string;
  updatedAt: string;
};

export async function listContentVariants(userId: number, contentItemId: number) {
  const result = await pool.query(
    `SELECT id, user_id AS "userId", content_item_id AS "contentItemId", platform,
            hook, body, cta, media_id AS "mediaId", status,
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM marketing_content_item_variants
      WHERE user_id = $1 AND content_item_id = $2
      ORDER BY platform`,
    [userId, contentItemId],
  );
  return result.rows as MarketingContentVariant[];
}

export async function listContentVariantsForContentItems(userId: number, contentItemIds: number[]) {
  if (contentItemIds.length === 0) return [] as MarketingContentVariant[];
  const result = await pool.query(
    `SELECT id, user_id AS "userId", content_item_id AS "contentItemId", platform,
            hook, body, cta, media_id AS "mediaId", status,
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM marketing_content_item_variants
      WHERE user_id = $1 AND content_item_id = ANY($2::bigint[])
      ORDER BY content_item_id, platform`,
    [userId, contentItemIds],
  );
  return result.rows as MarketingContentVariant[];
}
