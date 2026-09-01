import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  attachMediaToProduct,
  getProductMedia,
} from "@/lib/commerce/products/media";

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

    const media = await getProductMedia(id, userId);

    return NextResponse.json({
      success: true,
      media,
    });
  } catch (error) {
    console.error("GET product media error:", error);

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

    const mediaId = Number(body.mediaId);

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid mediaId is required",
        },
        { status: 400 },
      );
    }

    const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "sortOrder must be a non-negative integer",
        },
        { status: 400 },
      );
    }

    const isPrimary = body.isPrimary === true;

    const result = await attachMediaToProduct(
      id,
      mediaId,
      userId,
      sortOrder,
      isPrimary,
    );

    if (result.error === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      );
    }

    if (result.error === "MEDIA_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: "Media not found",
        },
        { status: 404 },
      );
    }

    if (result.error === "MEDIA_ALREADY_ATTACHED") {
      return NextResponse.json(
        {
          success: false,
          error: "Media is already attached to this product",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        media: result.media,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST product media error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
