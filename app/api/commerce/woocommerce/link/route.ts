import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getWooCommerceChannelConfig, wooCommerceRequest } from "@/lib/platforms/woocommerce/client";

function positiveId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return /^[1-9]\d{0,15}$/.test(text) ? text : null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = Number(session?.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const channelId = positiveId(body?.channelId);
  const productId = positiveId(body?.productId);
  const externalProductId = positiveId(body?.externalProductId);
  if (!channelId || !productId || !externalProductId) {
    return NextResponse.json({ success: false, error: "Valid channelId, productId and externalProductId are required." }, { status: 400 });
  }

  try {
    const channelResult = await pool.query(
      "SELECT id FROM commerce_channels WHERE id = $1 AND user_id = $2 AND provider = 'woocommerce'",
      [channelId, userId],
    );
    if (!channelResult.rows[0]) return NextResponse.json({ success: false, error: "WooCommerce channel not found." }, { status: 404 });
    const productResult = await pool.query(
      "SELECT id FROM products WHERE id = $1 AND user_id = $2",
      [productId, userId],
    );
    if (!productResult.rows[0]) return NextResponse.json({ success: false, error: "Canonical product not found." }, { status: 404 });

    // Verify the selected external identity against the connected store before persisting it.
    const { config } = await getWooCommerceChannelConfig(channelId, userId);
    const external = await wooCommerceRequest<Record<string, unknown>>(config, `products/${externalProductId}`);
    if (String(external.id) !== externalProductId || typeof external.name !== "string") {
      return NextResponse.json({ success: false, error: "WooCommerce did not confirm that product identity." }, { status: 409 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [channelId, externalProductId]);
      const conflict = await client.query(
        `SELECT id, product_id FROM product_listings
         WHERE user_id = $1 AND channel_id = $2 AND external_id = $3 AND product_id <> $4
         LIMIT 1 FOR UPDATE`,
        [userId, channelId, externalProductId, productId],
      );
      if (conflict.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "That WooCommerce product is already linked to another Dizito product in this store." }, { status: 409 });
      }

      const existing = await client.query(
        `SELECT id, external_id, provider_metadata FROM product_listings
         WHERE user_id = $1 AND channel_id = $2 AND product_id = $3
         LIMIT 1 FOR UPDATE`,
        [userId, channelId, productId],
      );
      if (existing.rows[0]?.external_id && existing.rows[0].external_id !== externalProductId) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: "This Dizito product already has a different external product ID for this store. Unlink or reconcile that listing before changing it." }, { status: 409 });
      }

      const snapshot = {
        ...(existing.rows[0]?.provider_metadata ?? {}),
        wooCommerceProduct: {
          id: externalProductId,
          name: external.name,
          sku: typeof external.sku === "string" ? external.sku : "",
          status: typeof external.status === "string" ? external.status : "unknown",
          type: typeof external.type === "string" ? external.type : "simple",
          price: typeof external.price === "string" ? external.price : "",
          stockStatus: typeof external.stock_status === "string" ? external.stock_status : "unknown",
          permalink: typeof external.permalink === "string" && /^https?:\/\//i.test(external.permalink) ? external.permalink : "",
          linkedAt: new Date().toISOString(),
        },
      };
      let listing;
      if (existing.rows[0]) {
        const result = await client.query(
          `UPDATE product_listings SET external_id = $1, provider_metadata = $2::jsonb,
             status = 'draft', sync_status = 'pending', last_error = NULL, updated_at = now()
           WHERE id = $3 AND user_id = $4
           RETURNING id, channel_id, product_id, external_id, status, sync_status, provider_metadata`,
          [externalProductId, JSON.stringify(snapshot), existing.rows[0].id, userId],
        );
        listing = result.rows[0];
      } else {
        const result = await client.query(
          `INSERT INTO product_listings
             (user_id, channel_id, product_id, external_id, status, sync_status, provider_metadata)
           VALUES ($1, $2, $3, $4, 'draft', 'pending', $5::jsonb)
           RETURNING id, channel_id, product_id, external_id, status, sync_status, provider_metadata`,
          [userId, channelId, productId, externalProductId, JSON.stringify(snapshot)],
        );
        listing = result.rows[0];
      }
      await client.query("COMMIT");
      return NextResponse.json({ success: true, listing });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/commerce/woocommerce/link error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to link WooCommerce product." }, { status: 502 });
  }
}
