import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const webhookUrl = "https://dizito.in/api/commerce/payments/webhook";

async function main() {
  const webhookSecret = process.env.COMMERCE_RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("COMMERCE_RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  /*
   * Replace these with the NEW refund you created for this test.
   */
  const providerRefundId = "rfnd_TEST_FAILURE_002";
  const providerPaymentId = "pay_TZR1thlUY7Ik65";

  const payload = {
    entity: "event",
    account_id: "8",
    event: "refund.failed",
    contains: ["refund"],
    payload: {
      refund: {
        entity: {
          id: providerRefundId,
          entity: "refund",
          amount: 100,
          currency: "INR",
          payment_id: providerPaymentId,
          status: "failed",
          notes: {},
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const rawBody = JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const eventId = `TEST-REFUND-FAILED-${Date.now()}`;

  console.log("Sending refund.failed webhook...");
  console.log("URL:", webhookUrl);
  console.log("PAYMENT ID:", providerPaymentId);
  console.log("REFUND ID:", providerRefundId);
  console.log("EVENT ID:", eventId);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Razorpay-Signature": signature,
      "X-Razorpay-Event-Id": eventId,
    },
    body: rawBody,
  });

  const responseText = await response.text();

  console.log("HTTP STATUS:", response.status);
  console.log("RESPONSE:", responseText);
  console.log("EVENT ID:", eventId);

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("TEST FAILED:", error);
  process.exitCode = 1;
});
