import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const { searchParams } = new URL(request.url);

    const locationIdParam = searchParams.get("locationId");
    const variantIdParam = searchParams.get("variantId");

    const locationId = locationIdParam ? Number(locationIdParam) : null;

    const variantId = variantIdParam ? Number(variantIdParam) : null;

    if (
      locationId !== null &&
      (!Number.isInteger(locationId) || locationId <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid locationId" },
        { status: 400 },
      );
    }

    if (
      variantId !== null &&
      (!Number.isInteger(variantId) || variantId <= 0)
    ) {
      return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
    }

    const values: unknown[] = [userId];

    const conditions = ["im.user_id = $1"];

    if (locationId !== null) {
      values.push(locationId);
      conditions.push(`im.location_id = $${values.length}`);
    }

    if (variantId !== null) {
      values.push(variantId);
      conditions.push(`im.variant_id = $${values.length}`);
    }

    const result = await pool.query(
      `
      SELECT
        im.id,
        im.location_id,
        il.name AS location_name,

        im.variant_id,
        pv.name AS variant_name,
        pv.sku,

        p.id AS product_id,
        p.name AS product_name,

        im.movement_type,
        im.quantity,
        im.reference_type,
        im.reference_id,
        im.note,
        im.created_at

      FROM inventory_movements im

      INNER JOIN inventory_locations il
        ON il.id = im.location_id

      INNER JOIN product_variants pv
        ON pv.id = im.variant_id

      INNER JOIN products p
        ON p.id = pv.product_id

      WHERE ${conditions.join(" AND ")}

      ORDER BY im.created_at DESC, im.id DESC

      LIMIT 200
      `,
      values,
    );

    return NextResponse.json({
      success: true,
      movements: result.rows,
    });
  } catch (error) {
    console.error("Inventory movements error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load inventory movements",
      },
      { status: 500 },
    );
  }
}
