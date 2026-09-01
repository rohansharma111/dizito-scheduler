import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  removeMediaFromProduct,
  updateProductMedia,
} from "@/lib/commerce/products/media";

interface Params {
  params: Promise<{
    id: string;
    mediaId: string;
  }>;
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
    const { id, mediaId } = await params;

    const body = await request.json();

    const input: {
      sortOrder?: number;
      isPrimary?: boolean;
    } = {};

    if (body.sortOrder !== undefined) {
      const sortOrder = Number(body.sortOrder);

      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "sortOrder must be a non-negative integer",
          },
          { status: 400 },
        );
      }

      input.sortOrder = sortOrder;
    }

    if (body.isPrimary !== undefined) {
      if (typeof body.isPrimary !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            error: "isPrimary must be a boolean",
          },
          { status: 400 },
        );
      }

      input.isPrimary = body.isPrimary;
    }

    const result = await updateProductMedia(id, mediaId, userId, input);

    if (result.error === "PRODUCT_MEDIA_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Product media not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      media: result.media,
    });
  } catch (error) {
    console.error("PATCH product media error:", error);

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
    const { id, mediaId } = await params;

    const deleted = await removeMediaFromProduct(id, mediaId, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Product media not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE product media error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
