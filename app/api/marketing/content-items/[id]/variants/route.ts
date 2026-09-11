import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { MARKETING_PLATFORMS } from "@/lib/marketing/contentVariants";

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return errorResponse("Invalid id");

  const result = await pool.query(
    `SELECT v.id, v.user_id AS "userId", v.content_item_id AS "contentItemId", v.platform,
            v.hook, v.body, v.cta, v.media_id AS "mediaId", v.status,
            v.created_at AS "createdAt", v.updated_at AS "updatedAt"
       FROM marketing_content_item_variants v
       JOIN marketing_content_items ci ON ci.id = v.content_item_id AND ci.user_id = v.user_id
      WHERE v.content_item_id = $1 AND v.user_id = $2
      ORDER BY v.platform`,
    [contentItemId, userId],
  );
  return Response.json({ variants: result.rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);
  const userId = Number((session.user as any).id);
  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return errorResponse("Invalid id");

  try {
    const body = await request.json();
    const platform = String(body.platform || "");
    if (!(MARKETING_PLATFORMS as readonly string[]).includes(platform)) return errorResponse("Unsupported platform");

    const item = await pool.query(
      `SELECT id FROM marketing_content_items WHERE id = $1 AND user_id = $2`,
      [contentItemId, userId],
    );
    if (item.rowCount === 0) return errorResponse("Content item not found", 404);

    const mediaId = body.mediaId == null ? null : Number(body.mediaId);
    if (mediaId !== null) {
      const media = await pool.query(
        `SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [mediaId, userId],
      );
      if (media.rowCount === 0) return errorResponse("Media not found", 400);
    }

    const result = await pool.query(
      `INSERT INTO marketing_content_item_variants
        (user_id, content_item_id, platform, hook, body, cta, media_id, status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ready',now())
       ON CONFLICT (content_item_id, platform)
       DO UPDATE SET hook=EXCLUDED.hook, body=EXCLUDED.body, cta=EXCLUDED.cta,
                     media_id=EXCLUDED.media_id, status='ready', updated_at=now()
       RETURNING id, user_id AS "userId", content_item_id AS "contentItemId", platform,
                 hook, body, cta, media_id AS "mediaId", status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, contentItemId, platform, body.hook ? String(body.hook) : null, body.body ? String(body.body) : null, body.cta ? String(body.cta) : null, mediaId],
    );
    return Response.json({ variant: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to save content variant", 500);
  }
}
