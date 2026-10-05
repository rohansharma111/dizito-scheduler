import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { listMarketingAssets } from "@/lib/marketing/assets";

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);

  const userId = Number((session.user as any).id);
  const assetType = new URL(request.url).searchParams.get("type") || undefined;
  return Response.json({ assets: await listMarketingAssets(userId, assetType) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return errorResponse("Unauthorized", 401);

  const userId = Number((session.user as any).id);
  const body = await request.json();
  const mediaId = Number(body.mediaId);
  if (!Number.isInteger(mediaId) || mediaId <= 0) return errorResponse("Invalid mediaId");

  const allowedTypes = ["general","product","service","team","customer","testimonial","logo","offer","lifestyle","before_after","video"];
  const assetType = body.assetType ?? "general";
  if (!allowedTypes.includes(assetType)) return errorResponse("Invalid assetType");

  const media = await pool.query(
    `SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [mediaId, userId],
  );
  if (media.rowCount === 0) return errorResponse("Media not found", 404);

  const rawProductIds: unknown[] = Array.isArray(body.productIds) ? body.productIds : [];
  const productIds: number[] = [...new Set(rawProductIds.map((value) => Number(value)))];
  if (productIds.some((id: number) => !Number.isInteger(id) || id <= 0)) return errorResponse("Invalid productIds");
  if (productIds.length) {
    const products = await pool.query(`SELECT id FROM products WHERE id = ANY($1) AND user_id = $2`, [productIds, userId]);
    if (products.rowCount !== productIds.length) return errorResponse("Invalid product selection");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO marketing_asset_metadata (media_id, user_id, asset_type, description, ai_context)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (media_id) DO UPDATE SET asset_type=EXCLUDED.asset_type, description=EXCLUDED.description, ai_context=EXCLUDED.ai_context, updated_at=now()`,
      [mediaId, userId, assetType, body.description ?? null, body.aiContext ?? null],
    );
    await client.query(`DELETE FROM marketing_asset_products WHERE media_id = $1`, [mediaId]);
    for (const productId of productIds) {
      await client.query(`INSERT INTO marketing_asset_products (media_id, product_id) VALUES ($1,$2)`, [mediaId, productId]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return errorResponse("Failed to classify asset", 500);
  } finally {
    client.release();
  }

  return Response.json({ asset: await (await import("@/lib/marketing/assets")).getMarketingAsset(userId, mediaId) });
}
