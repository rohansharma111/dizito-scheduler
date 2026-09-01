import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteVariant,
  getVariantById,
  updateVariant,
} from "@/lib/commerce/products/variants";

interface Params {
  params: Promise<{
    id: string;
    variantId: string;
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
    const { id, variantId } = await params;

    const variant = await getVariantById(id, variantId, userId);

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          error: "Variant not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      variant,
    });
  } catch (error) {
    console.error("GET variant error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
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
    const { id, variantId } = await params;

    const body = await request.json();

    const input: any = {};

    if (body.name !== undefined) {
      input.name = body.name === null ? null : String(body.name).trim();
    }

    if (body.sku !== undefined) {
      if (typeof body.sku !== "string" || !body.sku.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "SKU cannot be empty",
          },
          { status: 400 },
        );
      }

      input.sku = body.sku.trim();
    }

    if (body.barcode !== undefined) {
      input.barcode =
        body.barcode === null ? null : String(body.barcode).trim();
    }

    if (body.price !== undefined) {
      input.price = body.price === null ? null : Number(body.price);
    }

    if (body.mrp !== undefined) {
      input.mrp = body.mrp === null ? null : Number(body.mrp);
    }

    if (body.costPrice !== undefined) {
      input.costPrice = body.costPrice === null ? null : Number(body.costPrice);
    }

    if (body.weight !== undefined) {
      input.weight = body.weight === null ? null : Number(body.weight);
    }

    if (body.status !== undefined) {
      const allowedStatuses = ["active", "inactive", "archived"];

      if (
        typeof body.status !== "string" ||
        !allowedStatuses.includes(body.status)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid variant status",
          },
          { status: 400 },
        );
      }

      input.status = body.status;
    }

    const result = await updateVariant(id, variantId, userId, input);

    if (result.error === "VARIANT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Variant not found",
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

    return NextResponse.json({
      success: true,
      variant: result.variant,
    });
  } catch (error) {
    console.error("PATCH variant error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
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
    const { id, variantId } = await params;

    const result = await deleteVariant(id, variantId, userId);

    if (result.error === "VARIANT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Variant not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE variant error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
