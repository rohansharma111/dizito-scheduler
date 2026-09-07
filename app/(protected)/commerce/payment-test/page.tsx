"use client";

import { useEffect, useState } from "react";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export default function PaymentTestPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
      return;
    }

    const script = document.createElement("script");

    script.src = RAZORPAY_SCRIPT;
    script.async = true;

    document.body.appendChild(script);
  }, []);

  async function startPayment() {
    try {
      setLoading(true);
      setMessage("");

      /*
       * Fresh webhook-recovery test order.
       */
      const orderId = 15;

      const createResponse = await fetch("/api/commerce/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          amount: 1000,
          currency: "INR",
          paymentMethod: "card",
          idempotencyKey: "razorpay-webhook-recovery-002",
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(createData.error ?? "Unable to create payment");
      }

      const payment = createData.payment;
      const razorpayOrder = createData.razorpayOrder;

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again.",
        );
      }

      const options = {
        key: process.env.NEXT_PUBLIC_COMMERCE_RAZORPAY_KEY_ID,

        amount: razorpayOrder ? razorpayOrder.amount : payment.amount,

        currency: razorpayOrder ? razorpayOrder.currency : payment.currency,

        name: "Dizito",

        description: "Dizito Razorpay Webhook Recovery Test",

        order_id: payment.provider_order_id,

        /*
         * IMPORTANT:
         *
         * For this test we deliberately DO NOT
         * call the Dizito verification endpoint.
         *
         * Razorpay's webhook must be responsible
         * for moving the payment to paid.
         */
        handler: function () {
          setMessage("Checkout completed. Waiting for Razorpay webhook...");
        },

        modal: {
          ondismiss: function () {
            setMessage("Checkout closed.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.open();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start payment",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "60px auto",
        padding: 24,
      }}
    >
      <h1>Dizito Razorpay Webhook Test</h1>

      <p>Test Commerce payment for Order #15.</p>

      <p>Amount: ₹10.00</p>

      <p>
        This test intentionally relies on the Razorpay webhook instead of
        Checkout verification.
      </p>

      <button
        type="button"
        onClick={startPayment}
        disabled={loading}
        style={{
          padding: "12px 20px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Starting..." : "Pay ₹10.00"}
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
