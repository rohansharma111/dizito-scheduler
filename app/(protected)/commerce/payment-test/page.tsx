"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DizitoBadge, DizitoCard, DizitoPage, DizitoPageHeader, DizitoButton } from "@/components/dizito/DizitoUI";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface Payment {
  id: number;
  provider: string;
  payment_method: string | null;
  transaction_id: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface OrderInfo {
  id: number;
  order_number: string;
  total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  fulfillment_status: string;
  payments: Payment[];
}

export default function PaymentTestPage() {
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const [order, setOrder] = useState<OrderInfo | null>(null);

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
      return;
    }

    const script = document.createElement("script");

    script.src = RAZORPAY_SCRIPT;
    script.async = true;

    document.body.appendChild(script);
  }, []);

  function calculateTotalPaid(currentOrder: OrderInfo) {
    return currentOrder.payments.reduce((sum, payment) => {
      if (
        payment.status === "paid" ||
        payment.status === "partially_refunded" ||
        payment.status === "refunded"
      ) {
        return sum + Number(payment.amount);
      }

      return sum;
    }, 0);
  }

  function calculateRemainingAmount(currentOrder: OrderInfo) {
    const totalPaid = calculateTotalPaid(currentOrder);

    return Math.max(Number(currentOrder.total) - totalPaid, 0);
  }

  function formatMoney(amount: number, currency: string) {
    /*
     * Commerce amounts are stored in minor units.
     *
     * Current test flow uses INR, where 100000 = ₹1,000.
     */
    const exponent = currency === "INR" ? 2 : 2;

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(amount / 10 ** exponent);
  }

  async function loadOrder() {
    try {
      setLoadingOrder(true);
      setError("");
      setMessage("");
      setOrder(null);

      const parsedOrderId = Number(orderId);

      if (!Number.isSafeInteger(parsedOrderId) || parsedOrderId <= 0) {
        throw new Error("Enter a valid Order ID");
      }

      const response = await fetch(`/api/orders/${parsedOrderId}`);

      const data = await response.json();

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Unable to load order");
      }

      const apiOrder = data.order;

      const total = Number(apiOrder.total);
      const currency = String(apiOrder.currency ?? "").toUpperCase();

      if (!Number.isSafeInteger(total) || total <= 0) {
        throw new Error("Order has an invalid total");
      }

      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new Error("Order has an invalid currency");
      }

      const loadedOrder: OrderInfo = {
        id: Number(apiOrder.id),
        order_number: String(apiOrder.order_number ?? ""),
        total,
        currency,
        payment_status: String(apiOrder.payment_status ?? "unknown"),
        order_status: String(apiOrder.order_status ?? "unknown"),
        fulfillment_status: String(apiOrder.fulfillment_status ?? "unknown"),
        payments: Array.isArray(apiOrder.payments) ? apiOrder.payments : [],
      };

      setOrder(loadedOrder);

      const remaining = calculateRemainingAmount(loadedOrder);

      if (remaining > 0) {
        setMessage("Order loaded successfully.");
      } else {
        setMessage("This order has no remaining payable balance.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load order");
    } finally {
      setLoadingOrder(false);
    }
  }

  async function startPayment() {
    try {
      setLoadingPayment(true);
      setError("");
      setMessage("");

      if (!order) {
        throw new Error("Load an order first.");
      }

      const remainingAmount = calculateRemainingAmount(order);

      if (remainingAmount <= 0) {
        throw new Error("This order has no remaining payable balance.");
      }

      /*
       * Generate a fresh idempotency key for every intentional
       * new payment attempt.
       */
      const idempotencyKey = `dizito-test-${order.id}-${Date.now()}-${crypto.randomUUID()}`;

      const createResponse = await fetch("/api/commerce/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod,
          idempotencyKey,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(createData.error ?? "Unable to create payment");
      }

      const payment = createData.payment;
      const razorpayOrder = createData.razorpayOrder;

      const providerOrderId = payment?.provider_order_id ?? razorpayOrder?.id;

      if (!providerOrderId) {
        throw new Error("Razorpay order ID was not returned.");
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is still loading. Please try again.",
        );
      }

      const amount = Number(razorpayOrder?.amount ?? payment?.amount);

      const currency = String(
        razorpayOrder?.currency ?? payment?.currency ?? order.currency,
      ).toUpperCase();

      const options = {
        key: process.env.NEXT_PUBLIC_COMMERCE_RAZORPAY_KEY_ID,

        amount,

        currency,

        name: "Dizito",

        description: `Dizito Commerce Order #${order.id}`,

        order_id: providerOrderId,

        /*
         * Deliberately do not call a verification endpoint here.
         *
         * The current test is specifically validating that the
         * Razorpay webhook moves the payment to paid.
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

      setMessage(`Razorpay Checkout opened for Order #${order.id}.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start payment",
      );
    } finally {
      setLoadingPayment(false);
    }
  }

  const totalPaid = order ? calculateTotalPaid(order) : 0;

  const remainingAmount = order ? calculateRemainingAmount(order) : 0;

  return (
    <DizitoPage className="max-w-3xl px-4 sm:px-6">
      <DizitoPageHeader eyebrow="Commerce · Developer tools" title="Payment test" description="Test the Razorpay Commerce payment flow against an order in your account." />
      <div className="mb-5"><DizitoBadge tone="warning"><ShieldAlert size={13} /> Test workflow — verify environment before charging</DizitoBadge></div>

      <DizitoCard className="space-y-4">
        <label>
          <div className="mb-1.5 text-sm font-semibold text-slate-700">Order ID</div>

          <input
            type="number"
            min="1"
            value={orderId}
            onChange={(event) => {
              setOrderId(event.target.value);
              setOrder(null);
              setError("");
              setMessage("");
            }}
            placeholder="e.g. 25"
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <DizitoButton type="button" onClick={loadOrder} disabled={loadingOrder}>
          {loadingOrder ? "Loading..." : "Load Order"}
        </DizitoButton>

        {order && (
          <DizitoCard tone="soft">
            <h2 style={{ marginTop: 0 }}>Order #{order.id}</h2>

            {order.order_number && (
              <p>
                <strong>Order number:</strong> {order.order_number}
              </p>
            )}

            <p>
              <strong>Total:</strong> {formatMoney(order.total, order.currency)}
            </p>

            <p>
              <strong>Paid:</strong> {formatMoney(totalPaid, order.currency)}
            </p>

            <p>
              <strong>Remaining:</strong>{" "}
              {formatMoney(remainingAmount, order.currency)}
            </p>

            <p>
              <strong>Payment status:</strong> {order.payment_status}
            </p>

            <p>
              <strong>Order status:</strong> {order.order_status}
            </p>

            <p>
              <strong>Fulfillment:</strong> {order.fulfillment_status}
            </p>
          </DizitoCard>
        )}

        {order && remainingAmount > 0 && (
          <>
            <label>
              <div className="mb-1.5 text-sm font-semibold text-slate-700">Payment method</div>

              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallet</option>
              </select>
            </label>

            <DizitoButton type="button" onClick={startPayment} disabled={loadingPayment} className="w-full justify-center sm:w-auto">
              {loadingPayment
                ? "Starting..."
                : `Pay ${formatMoney(remainingAmount, order.currency)}`}
            </DizitoButton>
          </>
        )}

        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </DizitoCard>
    </DizitoPage>
  );
}
