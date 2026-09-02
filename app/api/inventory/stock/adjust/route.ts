import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adjustStock } from "@/lib/commerce/inventory/service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const locationId = Number(body.locationId);
    const variantId = Number(body.variantId);
    const quantityOnHand = Number(body.quantityOnHand);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid locationId" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
    }

    if (!Number.isInteger(quantityOnHand) || quantityOnHand < 0) {
      return NextResponse.json(
        {
          error: "quantityOnHand must be a non-negative integer",
        },
        { status: 400 },
      );
    }

    const result = await adjustStock(Number(session.user.id), {
      locationId,
      variantId,
      quantityOnHand,
      reason: body.reason,
      note: body.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Adjust stock error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to adjust stock",
      },
      { status: 400 },
    );
  }
}
