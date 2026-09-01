import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { addStock } from "@/lib/commerce/inventory/service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();

    const variantId = Number(body.variantId);

    const locationId = Number(body.locationId);

    const quantity = Number(body.quantity);

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid variant ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid location ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be a positive integer.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await addStock(Number(session.user.id), {
      variantId,
      locationId,
      quantity,
      movementType:
        typeof body.movementType === "string"
          ? body.movementType
          : "adjustment",
      referenceType:
        typeof body.referenceType === "string" ? body.referenceType : null,
      referenceId:
        body.referenceId !== undefined && body.referenceId !== null
          ? Number(body.referenceId)
          : null,
      note: typeof body.note === "string" ? body.note : null,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/inventory/stock error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
