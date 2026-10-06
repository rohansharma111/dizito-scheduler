import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getContentItem } from "@/lib/marketing/contentItems";

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return jsonError("Invalid id");

  const contentItem = await getContentItem(Number((session.user as any).id), contentItemId);
  if (!contentItem) return jsonError("Content item not found", 404);

  return Response.json({ contentItem });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const contentItemId = Number(id);
  if (!Number.isInteger(contentItemId) || contentItemId <= 0) return jsonError("Invalid id");

  const userId = Number((session.user as any).id);
  const body = await request.json();
  const allowedStatuses = ["draft", "planned", "ready", "converted", "archived"];
  if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
    return jsonError("Invalid status");
  }

  const existing = await getContentItem(userId, contentItemId);
  if (!existing) return jsonError("Content item not found", 404);

  if (existing.status === "converted") {
    const mutableFields = ["contentType", "format", "topic", "angle", "hook", "body", "cta", "channelStrategy", "mediaId", "plannedFor", "productIds"];
    if (mutableFields.some((field) => body[field] !== undefined)) {
      return jsonError("Converted content items cannot be edited");
    }
    if (body.status !== undefined && body.status !== "converted") {
      return jsonError("Converted content items cannot change status");
    }
  }

  if (body.mediaId !== undefined && body.mediaId !== null) {
    const mediaId = Number(body.mediaId);
    if (!Number.isInteger(mediaId) || mediaId <= 0) return jsonError("Invalid mediaId");

    const media = await pool.query(
      `SELECT id FROM media_library WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [mediaId, userId],
    );
    if (media.rowCount === 0) return jsonError("Invalid media selection");
  }

  const fields: Record<string, unknown> = {
    content_type: body.contentType,
    format: body.format,
    topic: body.topic,
    angle: body.angle,
    hook: body.hook,
    body: body.body,
    cta: body.cta,
    channel_strategy: body.channelStrategy,
    media_id: body.mediaId,
    status: body.status,
    planned_for: body.plannedFor,
  };

  const updates: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  for (const [column, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${column} = $${index++}`);
      values.push(value);
    }
  }

  if (updates.length === 0 && body.productIds === undefined) {
    return Response.json({ contentItem: existing });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (updates.length > 0) {
      values.push(contentItemId, userId);
      const result = await client.query(
        `UPDATE marketing_content_items
         SET ${updates.join(", ")}, updated_at = now()
         WHERE id = $${index} AND user_id = $${index + 1}
         RETURNING *`,
        values,
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return jsonError("Content item not found", 404);
      }
    }

    if (body.productIds !== undefined) {
      const rawProductIds: unknown[] = Array.isArray(body.productIds) ? body.productIds : [];
      const productIds: number[] = [...new Set(rawProductIds.map((value) => Number(value)))];
      if (productIds.some((productId: number) => !Number.isInteger(productId) || productId <= 0)) {
        await client.query("ROLLBACK");
        return jsonError("Invalid productIds");
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

      await client.query(
        `DELETE FROM marketing_content_item_products WHERE content_item_id = $1`,
        [contentItemId],
      );
      for (const productId of productIds) {
        await client.query(
          `INSERT INTO marketing_content_item_products (content_item_id, product_id) VALUES ($1,$2)`,
          [contentItemId, productId],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return jsonError("Failed to update content item", 500);
  } finally {
    client.release();
  }

  return Response.json({ contentItem: await getContentItem(userId, contentItemId) });
}
