import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shipmentService } from "@/lib/commerce/orders/shipment-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const result = await shipmentService.createShipment(
      Number(session.user.id),
      {
        orderId,
        locationId: Number(body?.locationId),
        carrier: body?.carrier,
        service: body?.service,
        trackingNumber: body?.trackingNumber,
        items: body?.items,
      },
    );

    return NextResponse.json(
      {
        success: true,
        shipment: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create shipment error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create shipment",
      },
      { status: 400 },
    );
  }
}
