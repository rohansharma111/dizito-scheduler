import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { returnService } from "@/lib/commerce/orders/return-service";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json();

    const result = await returnService.createReturn(Number(session.user.id), {
      orderId,
      reason: body.reason,
      customerNote: body.customerNote,
      items: body.items,
    });

    return NextResponse.json({
      success: true,
      return: result,
    });
  } catch (error) {
    console.error("Create return error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create return",
      },
      { status: 400 },
    );
  }
}
