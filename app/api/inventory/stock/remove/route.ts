import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeStock } from "@/lib/commerce/inventory/service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const locationId = Number(body.locationId);
    const variantId = Number(body.variantId);
    const quantity = Number(body.quantity);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid locationId" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json({ error: "Invalid variantId" }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive integer" },
        { status: 400 },
      );
    }

    const result = await removeStock(Number(session.user.id), {
      locationId,
      variantId,
      quantity,
      reason: body.reason,
      note: body.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Remove stock error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove stock",
      },
      { status: 400 },
    );
  }
}
