import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getContentItem, listContentItems } from "@/lib/marketing/contentItems";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const userId = Number((session.user as any).id);
  const url = new URL(request.url);
  const campaignParam = url.searchParams.get("campaignId");
  const campaignId = campaignParam ? Number(campaignParam) : undefined;

  if (campaignParam && (!Number.isInteger(campaignId) || campaignId! <= 0)) {
    return jsonError("Invalid campaignId");
  }

  return Response.json({ contentItems: await listContentItems(userId, campaignId) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const userId = Number((session.user as any).id);
  const body = await request.json();
  const campaignId = Number(body.campaignId);

  if (!Number.isInteger(campaignId) || campaignId <= 0) return jsonError("Invalid campaignId");
  if (!body.contentType || typeof body.contentType !== "string") return jsonError("contentType is required");

  const rawProductIds: unknown[] = Array.isArray(body.productIds) ? body.productIds : [];
  const productIds: number[] = [...new Set(rawProductIds.map((value) => Number(value)))];

  if (productIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
    return jsonError("Invalid productIds");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const campaign = await client.query(
      `SELECT id FROM marketing_campaigns WHERE id = $1 AND user_id = $2`,
      [campaignId, userId],
    );
    if (campaign.rowCount === 0) {
      await client.query("ROLLBACK");
      return jsonError("Campaign not found", 404);
    }

    if (productIds.length > 0) {
      const products = await client.query(
        `SELECT id FROM products WHERE id = ANY($1) AND user_id = $2`,
        [productIds, userId],
      );
      if (products.rowCount !== productIds.length) {
        await client.query("ROLLBACK");
        return jsonError("Invalid product selection");
      }
    }

    if (body.mediaId !== undefined && body.mediaId !== null) {
      const media = await client.query(
        `SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [Number(body.mediaId), userId],
      );
      if (media.rowCount === 0) {
        await client.query("ROLLBACK");
        return jsonError("Invalid media selection");
      }
    }

    const result = await client.query(
      `
        INSERT INTO marketing_content_items
        (user_id, campaign_id, content_type, format, topic, angle, hook, body, cta,
         channel_strategy, media_id, status, planned_for)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `,
      [
        userId,
        campaignId,
        body.contentType,
        body.format ?? null,
        body.topic ?? null,
        body.angle ?? null,
        body.hook ?? null,
        body.body ?? null,
        body.cta ?? null,
        body.channelStrategy ?? {},
        body.mediaId ?? null,
        body.status ?? "planned",
        body.plannedFor ?? null,
      ],
    );

    for (const productId of productIds) {
      await client.query(
        `INSERT INTO marketing_content_item_products (content_item_id, product_id) VALUES ($1,$2)`,
        [result.rows[0].id, productId],
      );
    }

    await client.query("COMMIT");
    const contentItem = await getContentItem(userId, Number(result.rows[0].id));
    return Response.json({ contentItem }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return jsonError("Failed to create content item", 500);
  } finally {
    client.release();
  }
}
