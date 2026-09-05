import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testWebhookAdapter } from "@/lib/commerce/payments/webhooks/providers/test";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signature = request.headers.get("x-test-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    /*
     * Read the raw body.
     *
     * Signature verification must use the exact raw
     * payload received from the provider.
     */
    const rawBody = await request.text();

    const isValid = testWebhookAdapter.verifySignature(rawBody, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    const event = testWebhookAdapter.normalizeEvent(payload);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Test webhook adapter error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook adapter processing failed",
      },
      { status: 400 },
    );
  }
}
