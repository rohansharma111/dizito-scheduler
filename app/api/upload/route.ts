import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No file uploaded",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File is empty",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File exceeds the maximum allowed size (10 MB)",
        },
        {
          status: 413,
        },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const media = await mediaService.uploadMedia({
      userId: Number(session.user.id),
      buffer,
      fileName: file.name,
      mimeType: file.type,
    });

    return NextResponse.json(
      {
        success: true,
        media,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Media upload failed:", error);

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
