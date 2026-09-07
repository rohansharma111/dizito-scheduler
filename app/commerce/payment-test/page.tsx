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
       * We already created Order #12 and its
       * Razorpay Order. For this first test,
       * use the existing payment attempt.
       */
      const orderId = 12;

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
          idempotencyKey: "razorpay-test-payment-001",
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(createData.error ?? "Unable to create payment");
      }

      const payment = createData.payment;

      const razorpayOrder = createData.razorpayOrder;

      /*
       * Wait briefly if the Checkout script
       * hasn't finished loading yet.
       */
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
        description: "Dizito Commerce Test Payment",

        order_id: payment.provider_order_id,

        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setMessage("Payment received. Verifying...");

            const verifyResponse = await fetch(
              "/api/commerce/payments/razorpay/verify",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,

                  razorpay_order_id: response.razorpay_order_id,

                  razorpay_signature: response.razorpay_signature,
                }),
              },
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.error ?? "Payment verification failed",
              );
            }

            setMessage(
              `Payment verified successfully. Payment ID: ${verifyData.providerPaymentId}`,
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Payment verification failed",
            );
          }
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
      <h1>Dizito Razorpay Test</h1>

      <p>Test Commerce payment for Order #12.</p>

      <p>Amount: ₹10.00</p>

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
