import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVariant, getVariants } from "@/lib/commerce/products/variants";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const userId = Number(session.user.id);
    const { id } = await params;

    const variants = await getVariants(id, userId);

    return NextResponse.json({
      success: true,
      variants,
    });
  } catch (error) {
    console.error("GET /api/products/[id]/variants error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const userId = Number(session.user.id);
    const { id } = await params;

    const body = await request.json();

    const sku = typeof body.sku === "string" ? body.sku.trim() : "";

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          error: "SKU is required",
        },
        { status: 400 },
      );
    }

    const result = await createVariant(id, userId, {
      name:
        body.name === undefined || body.name === null
          ? null
          : String(body.name).trim(),

      sku,

      barcode:
        body.barcode === undefined || body.barcode === null
          ? null
          : String(body.barcode).trim(),

      price:
        body.price === undefined || body.price === null
          ? null
          : Number(body.price),

      mrp:
        body.mrp === undefined || body.mrp === null ? null : Number(body.mrp),

      costPrice:
        body.costPrice === undefined || body.costPrice === null
          ? null
          : Number(body.costPrice),

      weight:
        body.weight === undefined || body.weight === null
          ? null
          : Number(body.weight),
    });

    if (result.error === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      );
    }

    if (result.error === "SKU_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          success: false,
          error: "SKU already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        variant: result.variant,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/products/[id]/variants error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
