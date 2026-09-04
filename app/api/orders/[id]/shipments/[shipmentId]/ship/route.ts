import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { shipmentService } from "@/lib/commerce/orders/shipment-service";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      shipmentId: string;
    }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, shipmentId } = await context.params;

    const orderId = Number(id);
    const parsedShipmentId = Number(shipmentId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!Number.isInteger(parsedShipmentId) || parsedShipmentId <= 0) {
      return NextResponse.json(
        { error: "Invalid shipment ID" },
        { status: 400 },
      );
    }

    const result = await shipmentService.shipShipment(
      Number(session.user.id),
      parsedShipmentId,
    );

    if (result.orderId !== orderId) {
      return NextResponse.json(
        { error: "Shipment does not belong to this order" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      shipment: result,
    });
  } catch (error) {
    console.error("Ship shipment error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to ship shipment",
      },
      { status: 400 },
    );
  }
}
