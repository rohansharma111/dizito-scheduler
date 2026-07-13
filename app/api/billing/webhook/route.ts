import { verifyWebhookSignature } from "@/lib/billing/webhooks/verify";
import { handleWebhookEvent } from "@/lib/billing/webhooks/handlers";
import { RazorpayWebhookEvent } from "@/lib/billing/webhooks/types";

export async function POST(request: Request) {
  try {
    /*
      Razorpay sends the signature
      in this header
    */
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return Response.json(
        {
          error: "Missing signature",
        },
        {
          status: 400,
        },
      );
    }

    /*
      IMPORTANT

      Read raw body.

      Do NOT call request.json()
      before verification.
    */

    const rawBody = await request.text();

    /*
      Verify webhook signature
    */

    const verified = verifyWebhookSignature(rawBody, signature);

    if (!verified) {
      return Response.json(
        {
          error: "Invalid webhook signature",
        },
        {
          status: 401,
        },
      );
    }

    /*
      Safe to parse now
    */

    const payload = JSON.parse(rawBody);

    const event = payload.event as RazorpayWebhookEvent;

    console.log("Billing Webhook:", event);

    /*
      Dispatch
    */

    await handleWebhookEvent(event, payload);

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("BILLING WEBHOOK ERROR", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Webhook failed",
      },
      {
        status: 500,
      },
    );
  }
}