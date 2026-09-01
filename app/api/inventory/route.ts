import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getInventory } from "@/lib/commerce/inventory/service";

export async function GET(request: Request) {
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

    const userId = Number(session.user.id);

    const { searchParams } = new URL(request.url);

    const locationIdParam = searchParams.get("locationId");

    const search = searchParams.get("search") || undefined;

    const locationId = locationIdParam ? Number(locationIdParam) : undefined;

    if (
      locationIdParam &&
      (!Number.isInteger(locationId) || locationId! <= 0)
    ) {
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

    const inventory = await getInventory(userId, {
      locationId,
      search,
    });

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error("GET /api/inventory error:", error);

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
