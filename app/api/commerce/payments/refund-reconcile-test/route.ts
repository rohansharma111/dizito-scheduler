import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { reconcileRazorpayRefund } from "@/lib/commerce/payments/refund-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const refundId = Number(body.refundId);

    const userId = Number(session.user.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return Response.json({ error: "Invalid user session" }, { status: 401 });
    }

    if (!Number.isSafeInteger(refundId) || refundId <= 0) {
      return Response.json({ error: "Invalid refundId" }, { status: 400 });
    }

    /*
     * IMPORTANT:
     * reconcileRazorpayRefund currently identifies the refund
     * by refund ID but does not yet verify that the refund
     * belongs to the authenticated user.
     *
     * This endpoint is temporary and used only for our
     * development test.
     */
    const result = await reconcileRazorpayRefund(refundId);

    return Response.json(result);
  } catch (error) {
    console.error("Refund reconciliation test endpoint error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Refund reconciliation failed",
      },
      { status: 500 },
    );
  }
}
