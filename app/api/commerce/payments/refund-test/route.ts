import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processRazorpayRefund } from "@/lib/commerce/payments/refund-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const orderId = Number(body.orderId);
    const paymentId = Number(body.paymentId);
    const amount = Number(body.amount);
    const currency = String(body.currency ?? "INR");
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    const reason =
      body.reason === undefined || body.reason === null
        ? null
        : String(body.reason);

    const userId = Number(session.user.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return Response.json({ error: "Invalid user session" }, { status: 401 });
    }

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "Invalid orderId" }, { status: 400 });
    }

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return Response.json({ error: "Invalid paymentId" }, { status: 400 });
    }

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json({ error: "Invalid refund amount" }, { status: 400 });
    }

    if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) {
      return Response.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return Response.json(
        { error: "idempotencyKey is required" },
        { status: 400 },
      );
    }

    const result = await processRazorpayRefund({
      userId,
      orderId,
      paymentId,
      amount,
      currency: currency.toUpperCase(),
      idempotencyKey,
      reason,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Refund test endpoint error:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Refund failed",
      },
      { status: 500 },
    );
  }
}
