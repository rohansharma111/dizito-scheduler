import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProduct, getProducts } from "@/lib/commerce/products/service";

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

    const userId = Number(session.user.id);

    const products = await getProducts(userId);

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("GET /api/products error:", error);

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

    const userId = Number(session.user.id);

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name is required",
        },
        {
          status: 400,
        },
      );
    }

    const description =
      body.description === undefined || body.description === null
        ? null
        : String(body.description).trim();

    const brand =
      body.brand === undefined || body.brand === null
        ? null
        : String(body.brand).trim();

    const category =
      body.category === undefined || body.category === null
        ? null
        : String(body.category).trim();

    const product = await createProduct(userId, {
      name,
      description,
      brand,
      category,
    });

    return NextResponse.json(
      {
        success: true,
        product,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST /api/products error:", error);

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
