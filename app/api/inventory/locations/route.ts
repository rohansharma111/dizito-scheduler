import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { createLocation, getLocations } from "@/lib/commerce/inventory/service";

export async function GET() {
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

    const locations = await getLocations(Number(session.user.id));

    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("GET /api/inventory/locations error:", error);

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

    const name = typeof body.name === "string" ? body.name : "";

    const type = typeof body.type === "string" ? body.type : "warehouse";

    const address = typeof body.address === "string" ? body.address : null;

    const location = await createLocation(Number(session.user.id), {
      name,
      type,
      address,
    });

    return NextResponse.json(
      {
        success: true,
        location,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST /api/inventory/locations error:", error);

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
